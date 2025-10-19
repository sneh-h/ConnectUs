import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('EMAIL REQUIRED');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('PASSWORD RESET EMAIL SENT! CHECK YOUR INBOX.');
      setEmail('');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('NO ACCOUNT FOUND WITH THIS EMAIL');
      } else {
        setError(error.message.toUpperCase());
      }
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
          <p className="auth-subtitle">RECOVER YOUR ACCESS</p>
        </div>

        <div className="reset-info">
          <div className="info-icon">🔐</div>
          <p className="info-text">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="auth-form">
          <div className="tactical-input-group">
            <label className="tactical-label">
              <span className="label-bracket">▷ </span>
              EMAIL ADDRESS
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

          {error && (
            <div className="error-message">
              ⚠ {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              ✓ {success}
            </div>
          )}

          <button type="submit" disabled={loading} className="tactical-button primary">
            {loading ? '◉ SENDING EMAIL...' : '▷ SEND RESET EMAIL'}
          </button>
        </form>

        <div className="auth-footer">
          <span className="footer-text">Remember your password? </span>
          <Link to="/login" className="auth-link">Back to Login</Link>
        </div>

        <div className="auth-footer">
          <span className="footer-text">Don't have an account? </span>
          <Link to="/register" className="auth-link">Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;