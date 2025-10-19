import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/pages/LandingPage';
import Login from './components/pages/Login';
import Dashboard from './components/pages/Dashboard';
import './App.css';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="radar-loader"></div>
        <div className="loading-text">CONNECTING...</div>
      </div>
    );
  }

  // Require email verification for access
  const isVerified = user && user.emailVerified;

  return (
    <Routes>
      <Route 
        path="/" 
        element={isVerified ? <Navigate to="/tracker" /> : <LandingPage />} 
      />
      <Route 
        path="/ConnectUs" 
        element={isVerified ? <Navigate to="/tracker" /> : <LandingPage />} 
      />
      <Route 
        path="/login" 
        element={isVerified ? <Navigate to="/tracker" /> : <Login />} 
      />
      <Route 
        path="/tracker" 
        element={isVerified ? <Dashboard /> : <Navigate to="/" />} 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;