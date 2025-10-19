import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Create floating particles
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.innerHTML = ['🛰️', '📡', '⚡', '🎯', '🌐', '📍', '⟡', '◉', '●', '▲', '◆', '⬢'][Math.floor(Math.random() * 12)];
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
      particle.style.color = ['#00ff88', '#ff0080', '#0080ff', '#ffaa00', '#ff6b6b', '#00ffff'][Math.floor(Math.random() * 6)];
      document.querySelector('.landing-container').appendChild(particle);
      
      setTimeout(() => {
        particle.remove();
      }, 5000);
    };

    const interval = setInterval(createParticle, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-container">
      <div className="landing-background">
        <div className="radar-grid-large"></div>
        <div className="connection-lines"></div>
      </div>

      <div className="landing-content">
        {/* Tracking Demo */}
        <div className="tracking-demo-large">
          <div className="location-dot-large" style={{left: '25%', top: '80px', backgroundColor: '#00ff88'}}></div>
          <div className="location-dot-large" style={{left: '65%', top: '120px', backgroundColor: '#ff0080'}}></div>
          <div className="location-dot-large" style={{left: '15%', top: '160px', backgroundColor: '#0080ff'}}></div>
          <div className="location-dot-large" style={{left: '80%', top: '140px', backgroundColor: '#ffaa00'}}></div>
          <div className="location-dot-large" style={{left: '40%', top: '180px', backgroundColor: '#ff6b6b'}}></div>
        </div>

        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-title-container">
            <h1 className="hero-title">
              Connect<span className="title-accent">Us</span>
            </h1>
            <p className="title-subtext">Stay on Track with your Pack.</p>
          </div>

          <p className="hero-subtitle">
            <span className="highlight">Live Group Tracking</span>that keeps everyone visible, alert, and never out of sight—because the journey's better together.
          </p>
          
          <div className="feature-highlights">
            <div className="highlight-item">
              <span className="highlight-icon">⚡</span>
              <span>Real-time Updates</span>
            </div>
            <div className="highlight-item">
              <span className="highlight-icon">🔒</span>
              <span>Secure & Private</span>
            </div>
            <div className="highlight-item">
              <span className="highlight-icon">📱</span>
              <span>Mobile Friendly</span>
            </div>
          </div>

          <div className="action-buttons">
            <Link to="/login" className="cta-button primary">
              Start Tracking
            </Link>
          </div>

          {/* Status Indicators */}
          <div className="status-indicators">
            <div className="status-item">
              <div className="status-dot active"></div>
              <span className="status-text">LIVE UPDATES</span>
            </div>
            <div className="status-item">
              <div className="status-dot active" style={{backgroundColor: '#0080ff'}}></div>
              <span className="status-text">FRIENDS & FAMILY</span>
            </div>
            <div className="status-item">
              <div className="status-dot active" style={{backgroundColor: '#ffaa00'}}></div>
              <span className="status-text">ALWAYS CONNECTED</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section">
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Live Location Sharing</h3>
            <p>See where your loved ones are in real-time with smooth, automatic updates</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">👨‍👩‍👧‍👦</div>
            <h3>Family & Friends</h3>
            <p>Create groups for family trips, friend meetups, or just staying connected daily</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Easy to Use</h3>
            <p>Simple setup with group codes. No complicated settings - just connect and go!</p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="security-badge">
          <div className="security-icon">🔐</div>
          <p className="security-text">Your privacy matters. Location data is secure and only shared with your chosen groups.</p>
          <p className="security-subtext">Made by Sneha Singh | © 2025 ConnectUs</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;