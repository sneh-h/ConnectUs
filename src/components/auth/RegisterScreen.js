import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase';

const RegisterScreen = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('NAME REQUIRED');
      return false;
    }
    if (!formData.email.trim()) {
      setError('EMAIL REQUIRED');
      return false;
    }
    if (formData.password.length < 6) {
      setError('PASSWORD MUST BE AT LEAST 6 CHARACTERS');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('PASSWORDS DO NOT MATCH');
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      // Send verification email
      await sendEmailVerification(userCredential.user);
      
      setSuccess('ACCOUNT CREATED! CHECK YOUR EMAIL TO VERIFY.');
      
      // Clear form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      
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
          <p className="auth-subtitle">JOIN THE TRACKING NETWORK</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="tactical-input-group">
            <label className="tactical-label">
              <span className="label-bracket">▷ </span>
              FULL NAME
            </label>
            <div className="tactical-input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="tactical-input"
                required
              />
            </div>
          </div>

          <div className="tactical-input-group">
            <label className="tactical-label">
              <span className="label-bracket">▷ </span>
              EMAIL ADDRESS
            </label>
            <div className="tactical-input-wrapper">
              <span className="input-icon">📧</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="tactical-input"
                required
              />
            </div>
          </div>

          <div className="tactical-input-group">
            <label className="tactical-label">
              <span className="label-bracket">▷ </span>
              PASSWORD
            </label>
            <div className="tactical-input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                className="tactical-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="eye-button"
              >
                {showPassword ? '👁️' : '👁️🗨️'}
              </button>
            </div>
          </div>

          <div className="tactical-input-group">
            <label className="tactical-label">
              <span className="label-bracket">▷ </span>
              CONFIRM PASSWORD
            </label>
            <div className="tactical-input-wrapper">
              <span className="input-icon">🔐</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
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
            {loading ? '◉ CREATING ACCOUNT...' : '▷ CREATE ACCOUNT'}
          </button>
        </form>

        <div className="auth-footer">
          <span className="footer-text">Already have an account? </span>
          <Link to="/login" className="auth-link">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;