import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function CombineDatasets() {
  const navigate = useNavigate();
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [impactMethod, setImpactMethod] = useState('naive');
  const [impactAssessment, setImpactAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Load selected datasets from localStorage
    if (localStorage.getItem('selectedDatasets')) {
      const selected = JSON.parse(localStorage.getItem('selectedDatasets'));
      setSelectedDatasets(selected);
      
      // Generate a default name
      if (selected.length > 0) {
        setName(`Combined dataset (${selected.map(d => d.name).join(' + ')})`);
      }
    }
  }, [navigate]);

  const handleRemoveDataset = (id) => {
    const updated = selectedDatasets.filter(d => d.id !== id);
    setSelectedDatasets(updated);
    localStorage.setItem('selectedDatasets', JSON.stringify(updated));
    
    // Update name if we still have datasets
    if (updated.length > 0) {
      setName(`Combined dataset (${updated.map(d => d.name).join(' + ')})`);
    }
    
    // Reset impact assessment when selection changes
    setImpactAssessment(null);
  };

  const handleAssessImpact = async () => {
    if (selectedDatasets.length < 2) {
      setError('Please select at least 2 datasets to assess impact');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/impact-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataset_ids: selectedDatasets.map(d => d.id),
          method: impactMethod
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to assess impact');
      }
      
      const data = await res.json();
      setImpactAssessment(data);
    } catch (err) {
      setError('Error assessing impact: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCombination = async () => {
    if (selectedDatasets.length < 2) {
      setError('Please select at least 2 datasets to combine');
      return;
    }
    
    if (!name.trim()) {
      setError('Please provide a name for the combined dataset');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/combined-datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name,
          description: description,
          dataset_ids: selectedDatasets.map(d => d.id)
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to create combined dataset');
      }
      
      setSuccess(true);
      
      // Clear the selected datasets
      localStorage.removeItem('selectedDatasets');
      
      // Navigate to combined datasets page after a short delay
      setTimeout(() => {
        navigate('/combined-datasets');
      }, 2000);
    } catch (err) {
      setError('Error creating combined dataset: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImpactLevelClass = (level) => {
    if (level === 'low') return 'impact-low';
    if (level === 'medium') return 'impact-medium';
    if (level === 'high') return 'impact-high';
    return '';
  };

  return (
    <div className="combine-datasets-container">
      <div className="page-header">
        <button onClick={() => navigate('/datasets')} className="back-btn">
          &larr; Back to Datasets
        </button>
        <h1>Combine Datasets</h1>
        <p className="subtitle">Create a new combined dataset and assess its impact</p>
      </div>

      <div className="section">
        <h2>Selected Datasets</h2>
        <div className="selected-datasets-grid">
          {selectedDatasets.map(dataset => (
            <div key={dataset.id} className="selected-dataset-card">
              <div className="card-header">
                <span className="dataset-name">{dataset.name}</span>
                <button className="remove-btn" onClick={() => handleRemoveDataset(dataset.id)}>✕</button>
              </div>
              <div className="dataset-id">{dataset.hf_id}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Combination Details</h2>
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter a name for the combined dataset"
            required
          />
        </div>
        <div className="form-group">
          <label>Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the purpose of this combination"
            rows={3}
          />
        </div>
      </div>

      <div className="section impact-section">
        <h2>Impact Assessment</h2>
        <div className="form-group">
          <label>Assessment Method</label>
          <select
            value={impactMethod}
            onChange={e => setImpactMethod(e.target.value)}
          >
            <option value="naive">Naive Method (Size-based)</option>
            <option value="advanced">Advanced Method (Clustering)</option>
          </select>
        </div>
        <button
          onClick={handleAssessImpact}
          className="secondary-btn"
          disabled={loading || selectedDatasets.length < 2}
        >
          {loading ? 'Assessing...' : 'Assess Impact'}
        </button>
        {impactAssessment && (
          <div className={`impact-result ${getImpactLevelClass(impactAssessment.level)}`}>
            <h4>Impact Assessment Result</h4>
            <div className="impact-level">
              Impact Level: <strong>{impactAssessment.level.toUpperCase()}</strong>
            </div>
            <p className="impact-explanation">{impactAssessment.explanation}</p>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button
          onClick={handleCreateCombination}
          className="primary-btn big"
          disabled={loading || selectedDatasets.length < 2 || !name.trim()}
        >
          {loading ? 'Creating...' : 'Create Combined Dataset'}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">
          Combined dataset created successfully! Redirecting...
        </div>
      )}
    </div>
  );
}