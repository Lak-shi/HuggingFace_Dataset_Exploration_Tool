import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function FollowedDatasets() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchFollowedDatasets();
  }, []);

  const fetchFollowedDatasets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/user/followed-datasets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch followed datasets');
      }
      
      const data = await res.json();
      setDatasets(data);
    } catch (err) {
      setError('Error loading followed datasets: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollowDataset = async (hfId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/datasets/${hfId}/unfollow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to unfollow dataset');
      }
      
      // Update the datasets list
      setDatasets(datasets.filter(ds => ds.hf_id !== hfId));
    } catch (err) {
      setError('Error unfollowing dataset: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading followed datasets...</div>;
  }

  return (
    <div className="followed-datasets-container">
      <div className="page-header">
        <button onClick={() => navigate('/datasets')} className="back-btn">
          &larr; Back to Datasets
        </button>
        <h1>My Followed Datasets</h1>
        <p className="subtitle">Datasets you're following</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {datasets.length === 0 ? (
        <div className="no-followed">
          <p>You're not following any datasets yet.</p>
          <button onClick={() => navigate('/datasets')} className="primary-btn">
            Browse Datasets
          </button>
        </div>
      ) : (
        <div className="datasets-grid">
          {datasets.map(dataset => (
            <div key={dataset.id} className="dataset-card">
              <div onClick={() => navigate(`/datasets/${dataset.hf_id}`)} className="dataset-click-area">
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
                  <span className="followers">
                    {dataset.follower_count || 0} followers
                  </span>
                  <span className="size">
                    {dataset.size_bytes 
                      ? `${Math.round(dataset.size_bytes / 1024 / 1024)} MB`
                      : 'Size unknown'}
                  </span>
                </div>
              </div>
              
              <button 
                className="unfollow-btn"
                onClick={() => handleUnfollowDataset(dataset.hf_id)}
              >
                Unfollow
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}