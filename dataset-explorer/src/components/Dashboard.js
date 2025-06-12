// import React from 'react';

// export default function Dashboard() {
//   return (
//     <div style={{ padding: '2rem', textAlign: 'center' }}>
//       <h1>Welcome to your dashboard!</h1>
//       <p>This is the page you see after signing in.</p>
//     </div>
//   );
// }

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [followedDatasets, setFollowedDatasets] = useState([]);
  const [combinedDatasets, setCombinedDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch user profile
      const profileRes = await fetch('/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUserEmail(profileData.email);
      }
      
      // Fetch followed datasets
      const followedRes = await fetch('/user/followed-datasets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (followedRes.ok) {
        const followedData = await followedRes.json();
        setFollowedDatasets(followedData);
      }
      
      // Fetch combined datasets
      const combinedRes = await fetch('/combined-datasets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (combinedRes.ok) {
        const combinedData = await combinedRes.json();
        setCombinedDatasets(combinedData);
      }
      
      setError(null);
    } catch (err) {
      setError('Error loading dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImpactLevelClass = (level) => {
    if (!level) return '';
    if (level === 'low') return 'impact-low';
    if (level === 'medium') return 'impact-medium';
    if (level === 'high') return 'impact-high';
    return '';
  };

  if (loading) {
    return <div className="loading-container">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome to Dataset Explorer</h1>
        <p>Hello, {userEmail}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Followed Datasets</h3>
          <div className="stat-value">{followedDatasets.length}</div>
          <button 
            onClick={() => navigate('/followed-datasets')}
            className="view-all-btn"
          >
            View All
          </button>
        </div>
        
        <div className="stat-card">
          <h3>Combined Datasets</h3>
          <div className="stat-value">{combinedDatasets.length}</div>
          <button 
            onClick={() => navigate('/combined-datasets')}
            className="view-all-btn"
          >
            View All
          </button>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recently Followed Datasets</h2>
            <button 
              onClick={() => navigate('/followed-datasets')}
              className="view-all-link"
            >
              View All &rarr;
            </button>
          </div>
          
          {followedDatasets.length === 0 ? (
            <div className="empty-section">
              <p>You're not following any datasets yet.</p>
              <button 
                onClick={() => navigate('/datasets')}
                className="primary-btn"
              >
                Browse Datasets
              </button>
            </div>
          ) : (
            <div className="datasets-grid small">
              {followedDatasets.slice(0, 3).map(dataset => (
                <div 
                  key={dataset.id} 
                  className="dataset-card"
                  onClick={() => navigate(`/datasets/${dataset.hf_id}`)}
                >
                  <h3 className="dataset-name">{dataset.name}</h3>
                  <div className="dataset-id">{dataset.hf_id}</div>
                  {dataset.description && (
                    <p className="dataset-description">
                      {dataset.description.length > 80
                        ? `${dataset.description.substring(0, 80)}...`
                        : dataset.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Combinations</h2>
            <button 
              onClick={() => navigate('/combined-datasets')}
              className="view-all-link"
            >
              View All &rarr;
            </button>
          </div>
          
          {combinedDatasets.length === 0 ? (
            <div className="empty-section">
              <p>You haven't created any dataset combinations yet.</p>
              <button 
                onClick={() => navigate('/datasets')}
                className="primary-btn"
              >
                Create Combination
              </button>
            </div>
          ) : (
            <div className="combinations-grid">
              {combinedDatasets.slice(0, 3).map(combination => (
                <div 
                  key={combination.id} 
                  className="combination-card"
                  onClick={() => navigate(`/combined-datasets/${combination.id}`)}
                >
                  <div className="combination-header">
                    <h3>{combination.name}</h3>
                    <div className={`impact-badge ${getImpactLevelClass(combination.impact_level)}`}>
                      {combination.impact_level?.toUpperCase() || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="combination-meta">
                    <span className="dataset-count">
                      {combination.datasets.length} datasets
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button 
            onClick={() => navigate('/datasets')}
            className="action-btn"
          >
            Browse Datasets
          </button>
          <button 
            onClick={() => navigate('/combine-datasets')}
            className="action-btn"
          >
            Create Combination
          </button>
        </div>
      </div>
    </div>
  );
}