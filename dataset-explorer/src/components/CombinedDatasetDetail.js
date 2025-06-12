import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../App.css';

export default function CombinedDatasetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [combinedDataset, setCombinedDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCombinedDataset = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/combined-datasets/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch combined dataset');
      }
      
      const data = await res.json();
      setCombinedDataset(data);
    } catch (err) {
      setError('Error loading combined dataset: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCombinedDataset();
  }, [id, fetchCombinedDataset, navigate]);

  const getImpactLevelClass = (level) => {
    if (!level) return '';
    if (level === 'low') return 'impact-low';
    if (level === 'medium') return 'impact-medium';
    if (level === 'high') return 'impact-high';
    return '';
  };

  if (loading) {
    return <div className="loading-container">Loading combined dataset...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  if (!combinedDataset) {
    return <div className="not-found-container">Combined dataset not found</div>;
  }

  return (
    <div className="combined-detail-container">
      <div className="page-header">
        <button onClick={() => navigate('/combined-datasets')} className="back-btn">
          &larr; Back to Combined Datasets
        </button>
        <h1>{combinedDataset.name}</h1>
        <div className={`impact-badge ${getImpactLevelClass(combinedDataset.impact_level)}`}>
          Impact: {combinedDataset.impact_level?.toUpperCase() || 'N/A'}
        </div>
      </div>

      <div className="combined-info">
        {combinedDataset.description && (
          <div className="description-section">
            <h3>Description</h3>
            <p>{combinedDataset.description}</p>
          </div>
        )}
        
        <div className="meta-section">
          <div className="meta-item">
            <span className="meta-label">Created</span>
            <span className="meta-value">
              {new Date(combinedDataset.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Datasets</span>
            <span className="meta-value">{combinedDataset.datasets.length}</span>
          </div>
        </div>
      </div>

      <div className="included-datasets-section">
        <h3>Included Datasets</h3>
        <div className="datasets-grid small">
          {combinedDataset.datasets.map(dataset => (
            <div 
              key={dataset.id} 
              className="dataset-card"
              onClick={() => navigate(`/datasets/${encodeURIComponent(dataset.hf_id)}`)}
            >
              <h3 className="dataset-name">{dataset.name}</h3>
              <div className="dataset-id">{dataset.hf_id}</div>
              {dataset.description && (
                <p className="dataset-description">
                  {dataset.description.length > 100
                    ? `${dataset.description.substring(0, 100)}...`
                    : dataset.description}
                </p>
              )}
              <div className="dataset-meta">
                <span className="size">
                  {dataset.size_bytes 
                    ? `${Math.round(dataset.size_bytes / 1024 / 1024)} MB`
                    : 'Size unknown'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
