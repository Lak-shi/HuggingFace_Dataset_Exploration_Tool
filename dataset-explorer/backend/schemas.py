from pydantic import BaseModel, EmailStr, validator, Field
from typing import List, Optional
from datetime import datetime

# User schemas
## For logging in
class UserLogin(BaseModel):
    email: EmailStr
    password: str

## For creating new account or registering
class UserCreate(UserLogin):
    confirm_password: str

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if v != values.get('password'):
            raise ValueError("Passwords do not match")
        return v

class UserBase(BaseModel):
    email: EmailStr

## For user profile
class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True  # Changed from orm_mode=True for Pydantic v2

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Dataset schemas
class DatasetBase(BaseModel):
    hf_id: str
    name: str
    description: Optional[str] = None

class DatasetCreate(DatasetBase):
    size_bytes: Optional[int] = None

class Dataset(DatasetBase):
    id: int
    last_modified: datetime
    size_bytes: Optional[int] = None
    follower_count: Optional[int] = None
    
    class Config:
        from_attributes = True  # Changed from orm_mode=True for Pydantic v2

# Dataset history schemas
class DatasetHistoryBase(BaseModel):
    commit_id: str
    commit_message: Optional[str] = None
    timestamp: datetime

class DatasetHistory(DatasetHistoryBase):
    id: int
    dataset_id: int
    
    class Config:
        from_attributes = True  # Changed from orm_mode=True for Pydantic v2

# Combined dataset schemas
class CombinedDatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    dataset_ids: List[int]

class CombinedDataset(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    created_by_id: int
    impact_level: Optional[str] = None
    datasets: List[Dataset] = []
    
    class Config:
        from_attributes = True  # Changed from orm_mode=True for Pydantic v2

# Impact assessment schemas
class ImpactAssessment(BaseModel):
    dataset_ids: List[int]
    method: str = "naive"  # "naive" or "advanced"

class ImpactResult(BaseModel):
    level: str  # "low", "medium", "high"
    explanation: str