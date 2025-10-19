import React, { useState } from 'react';
import { sendMemberRequest, getGroupIdByCode } from '../../firebase/location';
import { useAuth } from '../../contexts/AuthContext';
import './JoinGroup.css';

const JoinGroup = ({ onJoinSuccess, onCancel }) => {
  const { user } = useAuth();
  const [groupCode, setGroupCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!groupCode.trim()) {
      setError('Please enter a group code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const groupId = await getGroupIdByCode(groupCode.trim());
      if (!groupId) {
        setError('Group not found. Please check the code.');
        setLoading(false);
        return;
      }

      await sendMemberRequest(groupId, {
        userId: user.uid,
        name: user.email.split('@')[0],
        email: user.email,
        message: message.trim() || 'I would like to join your group.',
        groupCode: groupCode.trim()
      });

      setRequestSent(true);
      setTimeout(() => {
        if (onJoinSuccess) onJoinSuccess();
      }, 2000);

    } catch (error) {
      console.error('Error sending request:', error);
      setError('Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (requestSent) {
    return (
      <div className="join-group-container">
        <div className="join-group-form">
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>Request Sent!</h2>
            <p>Your request to join the group has been sent to the admin.</p>
            <p>You'll be notified when it's approved.</p>
            <button onClick={onCancel} className="back-btn">
              Back to Groups
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-group-container">
      <div className="join-group-form">
        <h2>🔗 Join Group</h2>
        <p>Enter the group code to send a join request</p>
        
        <form onSubmit={handleSendRequest}>
          <div className="form-group">
            <label>Group Code</label>
            <input
              type="text"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
              placeholder="Enter group code"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Message (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why do you want to join this group?"
              rows="3"
              disabled={loading}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="send-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinGroup;