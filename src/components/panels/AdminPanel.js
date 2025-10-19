import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

const AdminPanel = ({ currentGroup, isAdmin, onMemberJoin }) => {
  const [joinRequests, setJoinRequests] = useState([]);
  const [groupCode, setGroupCode] = useState('');

  useEffect(() => {
    if (currentGroup && isAdmin) {
      // Generate or get group code
      const code = currentGroup.code || generateGroupCode();
      setGroupCode(code);
      
      // Listen for join requests (simulated)
      const interval = setInterval(() => {
        // This would be replaced with real Firebase listener
        checkForJoinRequests();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentGroup, isAdmin]);

  const generateGroupCode = () => {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  };

  const checkForJoinRequests = () => {
    // Simulated join request - replace with Firebase listener
    if (Math.random() > 0.9) {
      const newRequest = {
        id: Date.now(),
        name: `User${Math.floor(Math.random() * 1000)}`,
        email: `user${Math.floor(Math.random() * 1000)}@example.com`,
        timestamp: Date.now()
      };
      
      setJoinRequests(prev => [...prev, newRequest]);
      
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('New Join Request', {
          body: `${newRequest.name} wants to join the group`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  const handleApproveRequest = (request) => {
    setJoinRequests(prev => prev.filter(r => r.id !== request.id));
    onMemberJoin?.(request);
    
    if (Notification.permission === 'granted') {
      new Notification('Member Approved', {
        body: `${request.name} has joined the group`
      });
    }
  };

  const handleRejectRequest = (request) => {
    setJoinRequests(prev => prev.filter(r => r.id !== request.id));
  };

  const copyGroupCode = () => {
    navigator.clipboard.writeText(groupCode);
    alert('Group code copied to clipboard!');
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h3>👑 Admin Panel</h3>
      </div>

      <div className="group-code-section">
        <div className="code-label">Group Code</div>
        <div className="code-display">
          <span className="code-value">{groupCode}</span>
          <button onClick={copyGroupCode} className="copy-btn">📋</button>
        </div>
      </div>

      {joinRequests.length > 0 && (
        <div className="join-requests">
          <div className="requests-header">
            <span>Join Requests ({joinRequests.length})</span>
          </div>
          
          {joinRequests.map(request => (
            <div key={request.id} className="request-item">
              <div className="request-info">
                <div className="request-name">{request.name}</div>
                <div className="request-email">{request.email}</div>
              </div>
              <div className="request-actions">
                <button 
                  onClick={() => handleApproveRequest(request)}
                  className="approve-btn"
                >
                  ✓
                </button>
                <button 
                  onClick={() => handleRejectRequest(request)}
                  className="reject-btn"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;