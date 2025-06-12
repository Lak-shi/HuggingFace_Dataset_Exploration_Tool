import httpx
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from sklearn.cluster import KMeans
from sentence_transformers import SentenceTransformer

class HuggingFaceClient:
    """Client for interacting with the HuggingFace API"""
    
    def __init__(self, api_token: Optional[str] = None):
        self.base_url = "https://huggingface.co/api"
        self.headers = {}
        if api_token:
            self.headers["Authorization"] = f"Bearer {api_token}"
    
    async def get_datasets(self, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Fetch public datasets from HuggingFace"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/datasets?limit={limit}&offset={offset}", 
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to fetch datasets: {response.text}")
                
            return response.json()
    
    async def get_dataset_info(self, dataset_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific dataset"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/datasets/{dataset_id}", 
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to fetch dataset info: {response.text}")
                
            return response.json()
    
    async def get_dataset_history(self, dataset_id: str) -> List[Dict[str, Any]]:
        """Get commit history for a dataset"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/datasets/{dataset_id}/commits", 
                headers=self.headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to fetch dataset history: {response.text}")
                
            return response.json()


class ImpactAssessor:
    """Utility for assessing dataset impact"""
    
    @staticmethod
    def naive_assessment(datasets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Naive impact assessment based on dataset size
        Returns impact level: low, medium, high
        """
        total_size = sum(dataset.get("size_bytes", 0) for dataset in datasets)
        
        # Define thresholds for impact levels (in bytes)
        LOW_THRESHOLD = 10_000_000  # 10 MB
        HIGH_THRESHOLD = 1_000_000_000  # 1 GB
        
        if total_size < LOW_THRESHOLD:
            level = "low"
            explanation = f"Combined size ({total_size / 1_000_000:.2f} MB) is below threshold of {LOW_THRESHOLD / 1_000_000} MB"
        elif total_size < HIGH_THRESHOLD:
            level = "medium"
            explanation = f"Combined size ({total_size / 1_000_000:.2f} MB) is between {LOW_THRESHOLD / 1_000_000} MB and {HIGH_THRESHOLD / 1_000_000} MB"
        else:
            level = "high"
            explanation = f"Combined size ({total_size / 1_000_000:.2f} MB) exceeds threshold of {HIGH_THRESHOLD / 1_000_000} MB"
            
        return {
            "level": level,
            "explanation": explanation,
            "method": "naive",
            "total_size_bytes": total_size
        }
    
    @staticmethod
    def advanced_assessment(datasets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Advanced impact assessment using semantic clustering of descriptions.
        """
        # Load the model (should be global/singleton in production)
        if not hasattr(ImpactAssessor, '_model'):
            ImpactAssessor._model = SentenceTransformer('all-MiniLM-L6-v2')
        model = ImpactAssessor._model

        descriptions = [ds.get("description", "") or "" for ds in datasets]
        if not any(descriptions):
            # Fallback: if all descriptions are empty, use naive method
            return ImpactAssessor.naive_assessment(datasets)

        embeddings = model.encode(descriptions)
        n_clusters = min(len(datasets), 3)
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        clusters = kmeans.fit_predict(embeddings)
        unique_clusters = len(set(clusters))

        if unique_clusters == 1:
            level = "low"
            explanation = "Descriptions are semantically similar (single cluster)."
        elif unique_clusters == 2:
            level = "medium"
            explanation = "Descriptions form two distinct semantic clusters."
        else:
            level = "high"
            explanation = "Descriptions are diverse and form multiple semantic clusters."

        return {
            "level": level,
            "explanation": explanation,
            "method": "advanced",
            "cluster_count": unique_clusters
        }