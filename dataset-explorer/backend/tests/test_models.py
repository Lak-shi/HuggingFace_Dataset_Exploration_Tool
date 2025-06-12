import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Dataset, CombinedDataset
from datetime import datetime

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_create_user(db_session):
    user = User(
        email="test@example.com",
        hashed_password="hashedpassword123"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    assert user.id is not None
    assert user.email == "test@example.com"

def test_create_dataset(db_session):
    dataset = Dataset(
        hf_id="test-dataset",
        name="Test Dataset",
        description="A test dataset",
        last_modified=datetime.utcnow(),
        size_bytes=1000
    )
    db_session.add(dataset)
    db_session.commit()
    db_session.refresh(dataset)
    
    assert dataset.id is not None
    assert dataset.hf_id == "test-dataset"
    assert dataset.name == "Test Dataset"

def test_create_combined_dataset(db_session):
    # First create a user
    user = User(
        email="test@example.com",
        hashed_password="hashedpassword123"
    )
    db_session.add(user)
    db_session.commit()
    
    # Create a combined dataset
    combined = CombinedDataset(
        name="Test Combination",
        description="A test combination",
        created_by_id=user.id
    )
    db_session.add(combined)
    db_session.commit()
    db_session.refresh(combined)
    
    assert combined.id is not None
    assert combined.name == "Test Combination"
    assert combined.created_by_id == user.id 