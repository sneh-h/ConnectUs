import { useState } from 'react';
import { signIn, signUp, resendVerification } from '../../firebase/auth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';

import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [setVerificationSent] = useState(false);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (isSignUp) {
      if (!formData.displayName.trim()) {
        setError('Name is required');
        return false;
      }
      if (formData.displayName.trim().length < 2) {
        setError('Name too short (min 2 characters)');
        return false;
      }
      if (!formData.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (!formData.password) {
        setError('Password is required');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password too weak (min 6 characters)');
        return false;
      }
      if (!formData.confirmPassword) {
        setError('Confirm password is required');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    } else {
      if (!formData.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (!formData.password) {
        setError('Password is required');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isSignUp) {
        await signUp(formData.email, formData.password);
        alert('Account created! Please check your email to verify your account before signing in.');
        setIsSignUp(false);
      } else {
        const userCredential = await signIn(formData.email, formData.password);
        if (!userCredential.user.emailVerified) {
          setError('Please verify your email before signing in. Check your inbox for verification link.');
          return;
        }
      }
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setResetSent(true);
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification();
      setVerificationSent(true);
      alert('Verification email sent! Check your inbox and spam folder.');
    } catch (error) {
      setError('Failed to send verification email: ' + error.message);
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    const requirements = [
      { text: 'MIN 6 CHARACTERS', met: password.length >= 6 },
      { text: 'CONTAINS NUMBERS', met: /\d/.test(password) },
      { text: 'CONTAINS LETTERS', met: /[a-zA-Z]/.test(password) },
    ];
    return requirements;
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="radar-grid"></div>
      </div>
      
      <div className="auth-content">
        <div className="auth-header">
          <h1 className="auth-title">
            Connect<span className="title-accent">Us</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">⚠ {error}</div>}
          {resetSent && <div className="success-message">Password reset email sent! Check your inbox.</div>}
          
          {isSignUp && (
            <div className="input-container">
              <label className="input-label">
                <span className="input-bracket">▷ </span>FULL NAME
              </label>
              <div className="input-wrapper">
                <span className="input-icon">◉</span>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.displayName}
                  onChange={(e) => updateFormData('displayName', e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>
          )}
          
          <div className="input-container">
            <label className="input-label">
              <span className="input-bracket">▷ </span>EMAIL ADDRESS
            </label>
            <div className="input-wrapper">
              <span className="input-icon">◉</span>
              <input
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="auth-input"
                required
              />
            </div>
          </div>
          
          <div className="input-container">
            <label className="input-label">
              <span className="input-bracket">▷ </span>PASSWORD
            </label>
            <div className="input-wrapper">
              <span className="input-icon">⬢</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? 'Create password' : 'Enter your password'}
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className="auth-input"
                required
              />
              <span 
                className="eye-button" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </span>
            </div>
          </div>
          
          {isSignUp && formData.password.length > 0 && (
            <div className="security-requirements">
              <div className="requirements-title">SECURITY REQUIREMENTS:</div>
              {getPasswordStrength().map((req, index) => (
                <div key={index} className="requirement-item">
                  <div 
                    className="requirement-dot"
                    style={{backgroundColor: req.met ? '#00ff88' : '#ff0080'}}
                  ></div>
                  <span 
                    className="requirement-text"
                    style={{color: req.met ? '#00ff88' : '#ff0080'}}
                  >
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {isSignUp && (
            <div className="input-container">
              <label className="input-label">
                <span className="input-bracket">▷ </span>CONFIRM PASSWORD
              </label>
              <div className="input-wrapper">
                <span className="input-icon">⬢</span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  className="auth-input"
                  required
                />
                <span 
                  className="eye-button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </span>
              </div>
            </div>
          )}
          
          <button type="submit" className="tactical-button" disabled={loading}>
            {loading ? '◉ CONNECTING...' : (isSignUp ? '▷ CREATE ACCOUNT' : '▷ LOGIN')}
          </button>
          
          {!isSignUp && (
            <div className="forgot-password">
              <span onClick={handleForgotPassword} className="forgot-link">
                ▷ Forgot Password?
              </span>
              <br/>
              <span onClick={handleResendVerification} className="forgot-link">
                ▷ Resend Verification Email
              </span>
            </div>
          )}
          
          <div className="auth-footer">
            <span className="footer-text">{isSignUp ? 'Already have an account? ' : 'New to ConnectUs? '}</span>
            <span 
              onClick={() => setIsSignUp(!isSignUp)}
              className="link-text"
            >
              {isSignUp ? 'Sign In' : 'Create Account'}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;