import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create test client
client = TestClient(app)

# Test data
test_user = {
    "email": "test@example.com",
    "password": "testpassword"
}

def test_register_user():
    response = client.post("/register", json=test_user)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_login_user():
    response = client.post("/login", json=test_user)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_list_datasets():
    response = client.get("/datasets")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_get_dataset_detail():
    # First get a dataset ID from the list
    list_response = client.get("/datasets")
    if list_response.json():
        dataset_id = list_response.json()[0]["hf_id"]
        response = client.get(f"/datasets/{dataset_id}")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "description" in data 