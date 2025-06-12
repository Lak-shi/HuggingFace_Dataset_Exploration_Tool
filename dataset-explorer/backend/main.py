from fastapi import FastAPI, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend import models, schemas, security, huggingface
from backend.database import SessionLocal, engine
from sqlalchemy.sql import func
from fastapi.middleware.cors import CORSMiddleware
import os
from pydantic import EmailStr
from jose import jwt, JWTError
from datetime import datetime

# Create tables
models.Base.metadata.create_all(bind=engine)

# Initialize HuggingFace client
hf_client = huggingface.HuggingFaceClient(
    api_token=os.environ.get("HUGGINGFACE_API_TOKEN")
)

app = FastAPI(title="HuggingFace Dataset Explorer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication dependency
async def get_current_user(token: str = Depends(security.oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.decode_access_token(token)
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# Optional authentication - doesn't raise exception if no token
async def get_optional_user(token: Optional[str] = Depends(security.optional_oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
        
    try:
        payload = security.decode_access_token(token)
        email: str = payload.get("sub")
        if email is None:
            return None
    except:
        return None
        
    user = db.query(models.User).filter(models.User.email == email).first()
    return user

# Authentication endpoints
@app.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = security.hash_password(user_in.password)
    user = models.User(email=user_in.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = security.create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    
    token = security.create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

# User profile endpoint
@app.get("/profile", response_model=schemas.User)
def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user

# Dataset endpoints
@app.get("/datasets", response_model=List[schemas.Dataset])
async def list_datasets(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[models.User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """List public datasets from HuggingFace"""
    # Always fetch 20 from HuggingFace
    datasets = await hf_client.get_datasets(limit=20, offset=0)
    result = []
    for dataset_data in datasets:
        # Check if we have this dataset in our DB
        dataset = db.query(models.Dataset).filter(models.Dataset.hf_id == dataset_data["id"]).first()
        # If not, create a stub entry
        if not dataset:
            dataset = models.Dataset(
                hf_id=dataset_data["id"],
                name=dataset_data.get("name", dataset_data["id"]),
                description=dataset_data.get("description", ""),
                last_modified=datetime.utcnow(),
                size_bytes=dataset_data.get("size_bytes")
            )
            db.add(dataset)
            db.commit()
            db.refresh(dataset)
        # Get follower count
        follower_count = db.query(func.count(models.dataset_followers.c.user_id))\
            .filter(models.dataset_followers.c.dataset_id == dataset.id)\
            .scalar()
        # Create response object
        dataset_response = schemas.Dataset(
            id=dataset.id,
            hf_id=dataset.hf_id,
            name=dataset.name,
            description=dataset.description,
            last_modified=dataset.last_modified,
            size_bytes=dataset.size_bytes,
            follower_count=follower_count
        )
        result.append(dataset_response)
    # Slice according to requested limit and offset
    return result[offset:offset+limit]

@app.get("/datasets/{hf_id:path}", response_model=schemas.Dataset)
async def get_dataset(
    hf_id: str, 
    current_user: Optional[models.User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a dataset"""
    # Fetch from HuggingFace API
    try:
        dataset_data = await hf_client.get_dataset_info(hf_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {str(e)}")
    
    # Check if we have this dataset in our DB
    dataset = db.query(models.Dataset).filter(models.Dataset.hf_id == hf_id).first()
    
    # If not, create it
    if not dataset:
        dataset = models.Dataset(
            hf_id=dataset_data["id"],
            name=dataset_data.get("name", dataset_data["id"]),
            description=dataset_data.get("description", ""),
            last_modified=datetime.utcnow(),
            size_bytes=dataset_data.get("size_bytes")
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
    
    # Get follower count
    follower_count = db.query(func.count(models.dataset_followers.c.user_id))\
        .filter(models.dataset_followers.c.dataset_id == dataset.id)\
        .scalar()
    
    # Create response
    return schemas.Dataset(
        id=dataset.id,
        hf_id=dataset.hf_id,
        name=dataset.name,
        description=dataset.description,
        last_modified=dataset.last_modified,
        size_bytes=dataset.size_bytes,
        follower_count=follower_count
    )

@app.get("/datasets/{hf_id:path}/history", response_model=List[schemas.DatasetHistory])
async def get_dataset_history(
    hf_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get commit history for a dataset"""
    # Verify dataset exists
    dataset = db.query(models.Dataset).filter(models.Dataset.hf_id == hf_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Fetch history from HuggingFace API
    try:
        history_data = await hf_client.get_dataset_history(hf_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch history: {str(e)}")
    
    # Convert to our schema
    result = []
    for commit in history_data:
        # Check if we already have this commit
        history_item = db.query(models.DatasetHistory)\
            .filter(
                models.DatasetHistory.dataset_id == dataset.id,
                models.DatasetHistory.commit_id == commit["id"]
            ).first()
        
        # If not, create it
        if not history_item:
            history_item = models.DatasetHistory(
                dataset_id=dataset.id,
                commit_id=commit["id"],
                commit_message=commit.get("title", ""),
                timestamp=datetime.fromisoformat(commit["date"].replace('Z', '+00:00'))
            )
            db.add(history_item)
            db.commit()
            db.refresh(history_item)
        
        # Add to result
        result.append(schemas.DatasetHistory(
            id=history_item.id,
            dataset_id=history_item.dataset_id,
            commit_id=history_item.commit_id,
            commit_message=history_item.commit_message,
            timestamp=history_item.timestamp
        ))
    
    return result

@app.post("/datasets/{hf_id:path}/follow", response_model=schemas.Dataset)
async def follow_dataset(
    hf_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Follow a dataset"""
    try:
        # Get dataset
        dataset = db.query(models.Dataset).filter(models.Dataset.hf_id == hf_id).first()
        if not dataset:
            # Fetch from API and create
            try:
                dataset_data = await hf_client.get_dataset_info(hf_id)
                dataset = models.Dataset(
                    hf_id=dataset_data["id"],
                    name=dataset_data.get("name", dataset_data["id"]),
                    description=dataset_data.get("description", ""),
                    last_modified=datetime.utcnow(),
                    size_bytes=dataset_data.get("size_bytes")
                )
                db.add(dataset)
                db.commit()
                db.refresh(dataset)
            except Exception as e:
                raise HTTPException(status_code=404, detail=f"Dataset not found: {str(e)}")
        
        # Use a direct SQL query to check if the relationship already exists
        existing_relation = db.execute(
            models.dataset_followers.select().where(
                models.dataset_followers.c.user_id == current_user.id,
                models.dataset_followers.c.dataset_id == dataset.id
            )
        ).first()
        
        # If not already following, add the relationship
        if not existing_relation:
            # Add to followed datasets using the association table directly
            db.execute(
                models.dataset_followers.insert().values(
                    user_id=current_user.id,
                    dataset_id=dataset.id
                )
            )
            db.commit()
        
        # Get updated follower count
        follower_count = db.query(func.count(models.dataset_followers.c.user_id))\
            .filter(models.dataset_followers.c.dataset_id == dataset.id)\
            .scalar()
        
        # Return dataset info
        return schemas.Dataset(
            id=dataset.id,
            hf_id=dataset.hf_id,
            name=dataset.name,
            description=dataset.description,
            last_modified=dataset.last_modified,
            size_bytes=dataset.size_bytes,
            follower_count=follower_count
        )
    except Exception as e:
        # Log the error for debugging
        import logging
        logging.error(f"Error in follow_dataset: {str(e)}")
        # Re-raise with a clear message
        raise HTTPException(status_code=500, detail=f"Failed to follow dataset: {str(e)}")

@app.post("/datasets/{hf_id:path}/unfollow", response_model=schemas.Dataset)
async def unfollow_dataset(
    hf_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unfollow a dataset"""
    # Get dataset
    dataset = db.query(models.Dataset).filter(models.Dataset.hf_id == hf_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Check if following and remove the relationship using the association table
    db.execute(
        models.dataset_followers.delete().where(
            models.dataset_followers.c.user_id == current_user.id,
            models.dataset_followers.c.dataset_id == dataset.id
        )
    )
    db.commit()
    
    # Get updated follower count
    follower_count = db.query(func.count(models.dataset_followers.c.user_id))\
        .filter(models.dataset_followers.c.dataset_id == dataset.id)\
        .scalar()
    
    # Return dataset info
    return schemas.Dataset(
        id=dataset.id,
        hf_id=dataset.hf_id,
        name=dataset.name,
        description=dataset.description,
        last_modified=dataset.last_modified,
        size_bytes=dataset.size_bytes,
        follower_count=follower_count
    )

@app.get("/user/followed-datasets", response_model=List[schemas.Dataset])
async def get_followed_datasets(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get datasets followed by the current user"""
    result = []
    for dataset in current_user.followed_datasets:
        # Get follower count
        follower_count = db.query(func.count(models.dataset_followers.c.user_id))\
            .filter(models.dataset_followers.c.dataset_id == dataset.id)\
            .scalar()
        
        # Add to result
        result.append(schemas.Dataset(
            id=dataset.id,
            hf_id=dataset.hf_id,
            name=dataset.name,
            description=dataset.description,
            last_modified=dataset.last_modified,
            size_bytes=dataset.size_bytes,
            follower_count=follower_count
        ))
    
    return result

# Combined datasets endpoints
@app.post("/combined-datasets", response_model=schemas.CombinedDataset)
async def create_combined_dataset(
    dataset_in: schemas.CombinedDatasetCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a combined dataset"""
    # Verify all datasets exist
    datasets = []
    for dataset_id in dataset_in.dataset_ids:
        dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset with ID {dataset_id} not found")
        datasets.append(dataset)
    
    # Create combined dataset
    combined = models.CombinedDataset(
        name=dataset_in.name,
        description=dataset_in.description,
        created_by_id=current_user.id
    )
    combined.datasets = datasets
    db.add(combined)
    db.commit()
    db.refresh(combined)
    
    # Assess impact using the naive method by default
    impact_result = huggingface.ImpactAssessor.naive_assessment([{
        "id": ds.id,
        "size_bytes": ds.size_bytes or 0  # Default to 0 if size not available
    } for ds in datasets])
    
    # Update impact level
    combined.impact_level = impact_result["level"]
    db.commit()
    
    # Return combined dataset
    return schemas.CombinedDataset(
        id=combined.id,
        name=combined.name,
        description=combined.description,
        created_at=combined.created_at,
        created_by_id=combined.created_by_id,
        impact_level=combined.impact_level,
        datasets=[schemas.Dataset(
            id=ds.id,
            hf_id=ds.hf_id,
            name=ds.name,
            description=ds.description,
            last_modified=ds.last_modified,
            size_bytes=ds.size_bytes
        ) for ds in combined.datasets]
    )

@app.get("/combined-datasets", response_model=List[schemas.CombinedDataset])
async def list_combined_datasets(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List combined datasets created by the current user"""
    combined_datasets = db.query(models.CombinedDataset)\
        .filter(models.CombinedDataset.created_by_id == current_user.id)\
        .all()
    
    result = []
    for combined in combined_datasets:
        result.append(schemas.CombinedDataset(
            id=combined.id,
            name=combined.name,
            description=combined.description,
            created_at=combined.created_at,
            created_by_id=combined.created_by_id,
            impact_level=combined.impact_level,
            datasets=[schemas.Dataset(
                id=ds.id,
                hf_id=ds.hf_id,
                name=ds.name,
                description=ds.description,
                last_modified=ds.last_modified,
                size_bytes=ds.size_bytes
            ) for ds in combined.datasets]
        ))
    
    return result

@app.get("/combined-datasets/{combined_id}", response_model=schemas.CombinedDataset)
async def get_combined_dataset(
    combined_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a combined dataset by ID"""
    combined = db.query(models.CombinedDataset)\
        .filter(models.CombinedDataset.id == combined_id)\
        .first()
    
    if not combined:
        raise HTTPException(status_code=404, detail="Combined dataset not found")
    
    # Check ownership
    if combined.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this combined dataset")
    
    return schemas.CombinedDataset(
        id=combined.id,
        name=combined.name,
        description=combined.description,
        created_at=combined.created_at,
        created_by_id=combined.created_by_id,
        impact_level=combined.impact_level,
        datasets=[schemas.Dataset(
            id=ds.id,
            hf_id=ds.hf_id,
            name=ds.name,
            description=ds.description,
            last_modified=ds.last_modified,
            size_bytes=ds.size_bytes
        ) for ds in combined.datasets]
    )

@app.delete("/combined-datasets/{combined_id}", status_code=204)
def delete_combined_dataset(
    combined_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a combined dataset by ID (only if owned by the user)"""
    combined = db.query(models.CombinedDataset).filter(models.CombinedDataset.id == combined_id).first()
    if not combined:
        raise HTTPException(status_code=404, detail="Combined dataset not found")
    if combined.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this combined dataset")
    db.delete(combined)
    db.commit()
    return

# Impact assessment endpoints
@app.post("/impact-assessment", response_model=schemas.ImpactResult)
async def assess_impact(
    assessment: schemas.ImpactAssessment,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assess the impact of combining datasets"""
    # Verify all datasets exist
    datasets = []
    for dataset_id in assessment.dataset_ids:
        dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail=f"Dataset with ID {dataset_id} not found")
        
        # Convert to dict for impact assessor
        datasets.append({
            "id": dataset.id,
            "size_bytes": dataset.size_bytes or 0,  # Default to 0 if size not available
            "last_modified": dataset.last_modified
        })
    
    # Perform impact assessment
    if assessment.method == "naive":
        result = huggingface.ImpactAssessor.naive_assessment(datasets)
    elif assessment.method == "advanced":
        result = huggingface.ImpactAssessor.advanced_assessment(datasets)
    else:
        raise HTTPException(status_code=400, detail=f"Invalid assessment method: {assessment.method}")
    
    return schemas.ImpactResult(
        level=result["level"],
        explanation=result["explanation"]
    )

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}