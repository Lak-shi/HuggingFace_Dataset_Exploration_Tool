import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import DatasetList from './components/DatasetList';
import DatasetDetail from './components/DatasetDetail';
import CombineDatasets from './components/CombineDatasets';
import CombinedDatasets from './components/CombinedDatasets';
import CombinedDatasetDetail from './components/CombinedDatasetDetail';
import FollowedDatasets from './components/FollowedDatasets';
import Navbar from './components/Navbar';
import './App.css';

// Simple auth check
const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

// Protected route component
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="content-container">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<AuthForm />} />
          <Route path="/register" element={<AuthForm />} />
          <Route path="/datasets" element={<DatasetList />} />
          <Route path="/datasets/:hfId/*" element={<DatasetDetail />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/followed-datasets" element={
            <ProtectedRoute>
              <FollowedDatasets />
            </ProtectedRoute>
          } />
          <Route path="/combine-datasets" element={
            <ProtectedRoute>
              <CombineDatasets />
            </ProtectedRoute>
          } />
          <Route path="/combined-datasets" element={
            <ProtectedRoute>
              <CombinedDatasets />
            </ProtectedRoute>
          } />
          <Route path="/combined-datasets/:id" element={
            <ProtectedRoute>
              <CombinedDatasetDetail />
            </ProtectedRoute>
          } />
          
          {/* Default route */}
          <Route path="/" element={<Navigate to="/datasets" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;