import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function DatasetList() {
  const navigate = useNavigate();
  const [allDatasets, setAllDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followError, setFollowError] = useState(null);
  const [followingStatus, setFollowingStatus] = useState({});
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(false);

  const limit = 10; // 10 per page

  useEffect(() => {
    const fetchDatasets = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        let url = `/datasets?limit=${limit}&offset=${page * limit}`;
        if (searchTerm) {
          url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('Failed to fetch datasets');
        const data = await res.json();
        setAllDatasets(data);
        setHasMorePages(data.length === limit);
        setError(null);
      } catch (err) {
        setError('Error loading datasets: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    fetchDatasets();
  }, [page, searchTerm]);

  // Remove local filtering and slicing, since backend now paginates
  const datasetsToShow = allDatasets;

  const handleFollowDataset = async (hfId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    
    try {
      setFollowError(null);
      setFollowingStatus(prev => ({ ...prev, [hfId]: 'loading' }));
      
      const token = localStorage.getItem('token');
      
      console.log(`Following dataset: ${hfId}`);
      
      // Important: Use encodeURIComponent to properly handle slashes in dataset IDs
      const encodedId = encodeURIComponent(hfId);
      
      const res = await fetch(`/datasets/${encodedId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Try to parse the response as JSON
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!res.ok) {
        console.error('Follow request failed:', data);
        throw new Error(data.detail || 'Failed to follow dataset');
      }
      
      // Update the datasets list to show the new follower
      setAllDatasets(allDatasets.map(ds => 
        ds.hf_id === hfId 
          ? { ...ds, follower_count: (ds.follower_count || 0) + 1 } 
          : ds
      ));
      
      setFollowingStatus(prev => ({ ...prev, [hfId]: 'success' }));
      console.log(`Successfully followed dataset: ${hfId}`);
      
      // Clear success status after 2 seconds
      setTimeout(() => {
        setFollowingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[hfId];
          return newStatus;
        });
      }, 2000);
      
    } catch (err) {
      console.error('Error following dataset:', err);
      setFollowError(`Error following dataset: ${err.message}`);
      setFollowingStatus(prev => ({ ...prev, [hfId]: 'error' }));
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setFollowingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[hfId];
          return newStatus;
        });
      }, 3000);
    }
  };

  return (
    <div className="datasets-container">
      <div className="datasets-header">
        <h1>HuggingFace Datasets</h1>
        <p>Explore public datasets available on HuggingFace</p>
        
        <div className="search-bar">
          <form onSubmit={e => { e.preventDefault(); setPage(0); }}>
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            />
            <button type="submit">Search</button>
          </form>
        </div>
      </div>

      {loading && <div className="loading">Loading datasets...</div>}
      
      {error && <div className="error-message">{error}</div>}
      
      {followError && <div className="error-message">{followError}</div>}
      
      {!loading && !error && datasetsToShow.length === 0 && (
        <div className="no-results">No datasets found</div>
      )}

      <div className="datasets-grid">
        {datasetsToShow.map(dataset => (
          <div key={dataset.id} className="dataset-card" onClick={() => navigate(`/datasets/${encodeURIComponent(dataset.hf_id)}`)}>
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
            {isLoggedIn && (
              <button 
                className={`follow-btn ${followingStatus[dataset.hf_id] ? `follow-btn-${followingStatus[dataset.hf_id]}` : ''}`}
                onClick={e => handleFollowDataset(dataset.hf_id, e)}
                disabled={followingStatus[dataset.hf_id] === 'loading'}
              >
                {followingStatus[dataset.hf_id] === 'loading' ? 'Following...' : 
                 followingStatus[dataset.hf_id] === 'success' ? 'Followed!' : 
                 followingStatus[dataset.hf_id] === 'error' ? 'Error!' : 
                 '+ Follow'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="pagination">
        <button 
          onClick={() => setPage(prev => Math.max(0, prev - 1))}
          disabled={page === 0}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button 
          onClick={() => setPage(prev => prev + 1)}
          disabled={!hasMorePages}
        >
          Next
        </button>
      </div>

      {!isLoggedIn && (
        <div className="login-prompt">
          <p>
            <button onClick={() => navigate('/login')} className="link-btn">Sign in</button> or <button onClick={() => navigate('/register')} className="link-btn">create an account</button> to follow datasets and create combinations
          </p>
        </div>
      )}
    </div>
  );
}