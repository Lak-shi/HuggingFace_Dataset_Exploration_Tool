import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../App.css';

export default function DatasetDetail() {
  const { hfId: rawHfId } = useParams();
  const hfId = decodeURIComponent(rawHfId);
  const navigate = useNavigate();
  const [dataset, setDataset] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followError, setFollowError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchDataset = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const res = await fetch(`/datasets/${encodeURIComponent(hfId)}`, {
        headers
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch dataset');
      }
      
      const data = await res.json();
      setDataset(data);
      
      // Check if user follows this dataset
      if (isLoggedIn) {
        const followedRes = await fetch('/user/followed-datasets', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (followedRes.ok) {
          const followedData = await followedRes.json();
          setIsFollowing(followedData.some(d => d.id === data.id));
        }
      }
      
      // Add to selected datasets for potential combination
      if (localStorage.getItem('selectedDatasets')) {
        const selected = JSON.parse(localStorage.getItem('selectedDatasets'));
        setSelectedDatasets(selected);
      }
      
      setError(null);
    } catch (err) {
      setError('Error loading dataset: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [hfId, isLoggedIn]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    fetchDataset();
  }, [hfId, fetchDataset]);

  const fetchHistory = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/datasets/${encodeURIComponent(hfId)}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch dataset history');
      }
      
      const data = await res.json();
      setHistory(data);
      setShowHistory(true);
    } catch (err) {
      setError('Error loading history: ' + err.message);
    }
  };

  const handleFollowToggle = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    
    setFollowLoading(true);
    setFollowError(null);
    
    try {
      const token = localStorage.getItem('token');
      const endpoint = isFollowing ? `/datasets/${encodeURIComponent(hfId)}/unfollow` : `/datasets/${encodeURIComponent(hfId)}/follow`;
      
      console.log(`${isFollowing ? 'Unfollowing' : 'Following'} dataset: ${hfId}`);
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('Follow/unfollow request failed:', data);
        throw new Error(data.detail || `Failed to ${isFollowing ? 'unfollow' : 'follow'} dataset`);
      }
      
      setIsFollowing(!isFollowing);
      if (dataset) {
        setDataset({
          ...dataset,
          follower_count: isFollowing 
            ? Math.max(0, (dataset.follower_count || 1) - 1)
            : (dataset.follower_count || 0) + 1
        });
      }
      
      console.log(`Successfully ${isFollowing ? 'unfollowed' : 'followed'} dataset: ${hfId}`);
    } catch (err) {
      console.error(`Error ${isFollowing ? 'unfollowing' : 'following'} dataset:`, err);
      setFollowError(`Error ${isFollowing ? 'unfollowing' : 'following'} dataset: ${err.message}`);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSelectForCombination = () => {
    if (!dataset) return;
    
    // Get current selections from localStorage
    let selected = [];
    if (localStorage.getItem('selectedDatasets')) {
      selected = JSON.parse(localStorage.getItem('selectedDatasets'));
    }
    
    // Check if already selected
    const isSelected = selected.some(d => d.id === dataset.id);
    
    if (isSelected) {
      // Remove from selection
      selected = selected.filter(d => d.id !== dataset.id);
    } else {
      // Add to selection
      selected.push({
        id: dataset.id,
        name: dataset.name,
        hf_id: dataset.hf_id
      });
    }
    
    // Update localStorage and state
    localStorage.setItem('selectedDatasets', JSON.stringify(selected));
    setSelectedDatasets(selected);
  };

  const isSelectedForCombination = dataset && selectedDatasets.some(d => d.id === dataset.id);

  const navigateToCombine = () => {
    navigate('/combine-datasets');
  };

  if (loading) {
    return <div className="loading-container">Loading dataset...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  if (!dataset) {
    return <div className="not-found-container">Dataset not found</div>;
  }

  return (
    <div className="dataset-detail-container">
      <div className="dataset-header">
        <button onClick={() => navigate('/datasets')} className="back-btn">
          &larr; Back to Datasets
        </button>
        <h1>{dataset.name}</h1>
        <div className="dataset-id">{dataset.hf_id}</div>
        
        {followError && <div className="error-message">{followError}</div>}
      </div>

      <div className="dataset-actions">
        {isLoggedIn && (
          <>
            <button 
              onClick={handleFollowToggle} 
              className="action-btn"
              disabled={followLoading}
            >
              {followLoading 
                ? 'Loading...' 
                : isFollowing ? 'Unfollow' : 'Follow'} Dataset
            </button>
            <button onClick={fetchHistory} className="action-btn" disabled={showHistory}>
              {showHistory ? 'History Loaded' : 'View History'}
            </button>
            <button onClick={handleSelectForCombination} className={`action-btn ${isSelectedForCombination ? 'selected' : ''}`}>
              {isSelectedForCombination ? 'Remove from Selection' : 'Select for Combination'}
            </button>
            {selectedDatasets.length > 1 && (
              <button onClick={navigateToCombine} className="primary-btn">
                Combine {selectedDatasets.length} Datasets
              </button>
            )}
          </>
        )}
        <a 
          href={`https://huggingface.co/datasets/${dataset.hf_id}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="action-btn external"
        >
          View on HuggingFace
        </a>
      </div>

      <div className="dataset-info">
        <div className="dataset-stats">
          <div className="stat">
            <span className="stat-label">Followers</span>
            <span className="stat-value">{dataset.follower_count || 0}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Size</span>
            <span className="stat-value">
              {dataset.size_bytes 
                ? `${(dataset.size_bytes / 1024 / 1024).toFixed(2)} MB`
                : 'Unknown'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Last Modified</span>
            <span className="stat-value">
              {new Date(dataset.last_modified).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="dataset-description">
          <h3>Description</h3>
          <p>{dataset.description || 'No description available'}</p>
        </div>
      </div>

      {showHistory && (
        <div className="dataset-history">
          <h3>Dataset History</h3>
          {history.length === 0 ? (
            <p>No history available</p>
          ) : (
            <ul className="history-list">
              {history.map(item => (
                <li key={item.id} className="history-item">
                  <div className="commit-id">{item.commit_id.substring(0, 8)}</div>
                  <div className="commit-message">{item.commit_message || 'No commit message'}</div>
                  <div className="commit-date">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isLoggedIn && (
        <div className="login-prompt">
          <p>
            <button onClick={() => navigate('/login')} className="link-btn">Sign in</button> 
            {' '}to access more features like dataset history, following, and creating combinations
          </p>
        </div>
      )}
    </div>
  );
}