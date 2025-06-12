import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function CombinedDatasets() {
  const navigate = useNavigate();
  const [combinations, setCombinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchCombinedDatasets();
  }, [navigate]);

  const fetchCombinedDatasets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/combined-datasets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch combined datasets');
      }
      
      const data = await res.json();
      setCombinations(data);
    } catch (err) {
      setError('Error loading combined datasets: ' + err.message);
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

  const handleViewCombination = (id) => {
    navigate(`/combined-datasets/${id}`);
  };

  const handleCreateNew = () => {
    navigate('/combine-datasets');
  };

  const handleDeleteCombination = async (id) => {
    if (!window.confirm('Are you sure you want to delete this combination?')) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/combined-datasets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete combination');
      await fetchCombinedDatasets();
    } catch (err) {
      setError('Error deleting combination: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading combined datasets...</div>;
  }

  return (
    <div className="combined-datasets-container">
      <div className="page-header">
        <button onClick={() => navigate('/datasets')} className="back-btn">
          &larr; Back to Datasets
        </button>
        <h1>My Combined Datasets</h1>
        <p className="subtitle">View and manage your dataset combinations</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="actions-bar">
        <button onClick={handleCreateNew} className="primary-btn">
          Create New Combination
        </button>
      </div>

      {combinations.length === 0 ? (
        <div className="no-combinations">
          <p>You haven't created any dataset combinations yet.</p>
          <button onClick={handleCreateNew} className="secondary-btn">
            Get Started
          </button>
        </div>
      ) : (
        <div className="combinations-list">
          {combinations.map(combination => (
            <div 
              key={combination.id} 
              className="combination-card"
              onClick={() => handleViewCombination(combination.id)}
            >
              <div className="combination-header">
                <h3>{combination.name}</h3>
                <div className={`impact-badge ${getImpactLevelClass(combination.impact_level)}`}>
                  {combination.impact_level?.toUpperCase() || 'N/A'}
                </div>
                <button
                  className="delete-btn"
                  onClick={e => { e.stopPropagation(); handleDeleteCombination(combination.id); }}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
              
              {combination.description && (
                <p className="combination-description">
                  {combination.description}
                </p>
              )}
              
              <div className="combination-meta">
                <span className="created-date">
                  Created on {new Date(combination.created_at).toLocaleDateString()}
                </span>
                <span className="dataset-count">
                  {combination.datasets.length} datasets
                </span>
              </div>
              
              <div className="included-datasets">
                <h4>Included Datasets:</h4>
                <ul className="included-list">
                  {combination.datasets.map(dataset => (
                    <li key={dataset.id} className="included-item">
                      {dataset.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}