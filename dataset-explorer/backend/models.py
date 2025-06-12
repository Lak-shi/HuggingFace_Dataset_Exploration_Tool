from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Table, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# Association table for user-followed datasets
dataset_followers = Table(
    "dataset_followers",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("dataset_id", Integer, ForeignKey("datasets.id", ondelete="CASCADE"), primary_key=True)
)

# Association table for combined datasets
dataset_combinations = Table(
    "dataset_combinations",
    Base.metadata,
    Column("parent_id", Integer, ForeignKey("combined_datasets.id", ondelete="CASCADE"), primary_key=True),
    Column("dataset_id", Integer, ForeignKey("datasets.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Relationships
    followed_datasets = relationship(
        "Dataset", 
        secondary=dataset_followers, 
        back_populates="followers",
        lazy="joined"
    )
    combined_datasets = relationship(
        "CombinedDataset", 
        back_populates="created_by",
        cascade="all, delete-orphan"
    )

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    hf_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    last_modified = Column(DateTime, default=datetime.utcnow)
    size_bytes = Column(Integer, nullable=True)  # For impact assessment
    
    # Relationships
    followers = relationship(
        "User", 
        secondary=dataset_followers, 
        back_populates="followed_datasets",
        lazy="joined"
    )
    history = relationship(
        "DatasetHistory", 
        back_populates="dataset",
        cascade="all, delete-orphan"
    )
    in_combinations = relationship(
        "CombinedDataset", 
        secondary=dataset_combinations, 
        back_populates="datasets",
        lazy="joined"
    )

class DatasetHistory(Base):
    __tablename__ = "dataset_history"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"))
    commit_id = Column(String, nullable=False)
    commit_message = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    dataset = relationship("Dataset", back_populates="history")

class CombinedDataset(Base):
    __tablename__ = "combined_datasets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    impact_level = Column(String, nullable=True)  # low, medium, high
    
    # Relationships
    created_by = relationship("User", back_populates="combined_datasets")
    datasets = relationship(
        "Dataset", 
        secondary=dataset_combinations, 
        back_populates="in_combinations",
        lazy="joined"
    )