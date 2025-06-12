import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../App.css';

export default function AuthForm() {
  const navigate = useNavigate();
  const location = useLocation();

  // Use route to determine mode
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setMessage("Passwords don't match");
      setIsLoading(false);
      return;
    }

    const endpoint = isLogin ? '/login' : '/register';
    const payload = isLogin
      ? { email, password }
      : { email, password, confirm_password: confirmPassword };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        let errMsg = 'Something went wrong';
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errMsg = data.detail.map(err => err.msg).join('; ');
          } else if (typeof data.detail === 'string') {
            errMsg = data.detail;
          }
        }
        setMessage(errMsg);
        setIsLoading(false);
        return;
      }

      localStorage.setItem('token', data.access_token);
      setMessage(isLogin ? 'Logged in!' : 'Registered!');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setIsLoading(false);
      navigate('/datasets');
    } catch (err) {
      setMessage('Network error: ' + (err.message || 'Unknown error'));
      setIsLoading(false);
    }
  };

  // Toggle between login and register modes
  const toggleMode = () => {
    const newPath = isLogin ? '/register' : '/login';
    navigate(newPath, { replace: true });
    setMessage('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="form-header">
          <h2>{isLogin ? 'Welcome to Dataset Explorer' : 'Create account'}</h2>
          {isLogin && (
            <p className="subheader">
              Enter your email to sign in and explore HuggingFace datasets
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="form-body">
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com"
          />

          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {!isLogin && (
            <>
              <label>Confirm password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </>
          )}

          <button 
            type="submit" 
            className="primary-btn" 
            disabled={isLoading}
          >
            {isLoading 
              ? 'Loading...' 
              : isLogin ? 'Sign In' : 'Sign Up'
            }
          </button>

          <p className="bottom-text">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              className="link-btn"
              onClick={toggleMode}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>

        {message && (
          <p className={`message ${message.includes('error') || 
                                  message.includes('wrong') || 
                                  message.includes('failed') ? 
                                  'error' : 'success'}`}>
            {message}
          </p>
        )}
        <div className="public-access">
          <p>Just browsing? <button onClick={() => navigate('/datasets')} className="link-btn">View public datasets</button></p>
        </div>
      </div>
    </div>
  );
}