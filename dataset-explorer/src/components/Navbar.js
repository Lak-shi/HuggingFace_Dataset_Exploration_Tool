import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../App.css';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Check authentication status on mount and route change
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    // Fetch user profile if logged in
    if (token) {
      fetchUserProfile();
    }
  }, [location.pathname]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserEmail(data.email);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUserEmail('');
    navigate('/datasets');
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">
          <h1>Dataset Explorer</h1>
        </Link>
      </div>
      
      <div className="navbar-links">
        <Link to="/datasets" className="nav-link">
          Browse Datasets
        </Link>
        
        {isLoggedIn && (
          <>
            <Link to="/followed-datasets" className="nav-link">
              My Followed
            </Link>
            <Link to="/combined-datasets" className="nav-link">
              My Combinations
            </Link>
          </>
        )}
      </div>
      
      <div className="navbar-auth">
        {isLoggedIn ? (
          <div className="user-menu">
            <span className="user-email">{userEmail}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="login-btn">
              Login
            </Link>
            <Link to="/register" className="register-btn">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}