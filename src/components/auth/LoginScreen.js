import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Particle animation
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.innerHTML = ['🛰️', '📡', '⚡', '🎯', '🌐', '📍'][Math.floor(Math.random() * 6)];
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
      document.querySelector('.auth-container').appendChild(particle);
      
      setTimeout(() => {
        particle.remove();
      }, 5000);
    };

    const interval = setInterval(createParticle, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('ALL FIELDS REQUIRED');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        setError('EMAIL NOT VERIFIED. CHECK YOUR INBOX.');
        return;
      }
    } catch (error) {
      setError(error.message.toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="radar-grid"></div>
        <div className="connection-lines"></div>
      </div>

      <div className="auth-content">
        <div className="auth-header">
          <h1 className="auth-title">
            Connect<span className="title-accent">Us</span>
          </h1>
          <p className="auth-subtitle">Welcome back! Sign in to stay connected</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="tactical-input-group">
            <label className="tactical-label">
              Email Address
            </label>
            <div className="tactical-input-wrapper">
              <span className="input-icon">📧</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="tactical-input"
                required
              />
            </div>
          </div>

          <div className="tactical-input-group">
            <label className="tactical-label">
              Password
            </label>
            <div className="tactical-input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="tactical-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="eye-button"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="tactical-button primary">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <Link to="/forgot-password" className="forgot-link">
            Forgot Password?
          </Link>
        </form>

        <div className="auth-footer">
          <span className="footer-text">New to ConnectUs? </span>
          <Link to="/register" className="auth-link">Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;