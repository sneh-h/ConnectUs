import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updatePrivacySettings, getPrivacySettings } from '../../firebase/location';
import './PrivacySettings.css';

const PrivacySettings = ({ currentGroup, groupMembers, onClose }) => {
  const { user } = useAuth();
  const [shareWith, setShareWith] = useState('all');
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentGroup && user) {
      loadPrivacySettings();
    }
  }, [currentGroup, user]);

  const loadPrivacySettings = async () => {
    try {
      const settings = await getPrivacySettings(currentGroup, user.uid);
      if (settings) {
        setShareWith(settings.shareWith || 'all');
        setSelectedMembers(new Set(settings.selectedMembers || []));
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const handleMemberToggle = (memberId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const settings = {
        shareWith,
        selectedMembers: shareWith === 'selected' ? Array.from(selectedMembers) : [],
        updatedAt: Date.now()
      };
      
      await updatePrivacySettings(currentGroup, user.uid, settings);
      onClose();
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      alert('Failed to save privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const membersList = Object.entries(groupMembers || {}).filter(([id]) => id !== user.uid);
  
  console.log('Privacy Settings - Group Members:', groupMembers);
  console.log('Privacy Settings - Members List:', membersList);

  return (
    <div className="privacy-settings-overlay">
      <div className="privacy-settings-modal">
        <div className="privacy-header">
          <h3>🔒 Privacy Settings</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="privacy-content">
          <div className="share-option">
            <label className="radio-label">
              <input
                type="radio"
                name="shareWith"
                value="all"
                checked={shareWith === 'all'}
                onChange={(e) => setShareWith(e.target.value)}
              />
              <span className="radio-text">Share with all group members</span>
            </label>
          </div>

          <div className="share-option">
            <label className="radio-label">
              <input
                type="radio"
                name="shareWith"
                value="selected"
                checked={shareWith === 'selected'}
                onChange={(e) => setShareWith(e.target.value)}
              />
              <span className="radio-text">Share with selected members only</span>
            </label>
          </div>

          {shareWith === 'selected' && (
            <div className="members-selection">
              <h4>Select members to share your location with:</h4>
              <div className="members-list">
                {membersList.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No other members in group</p>
                ) : (
                  membersList.map(([memberId, member]) => {
                    console.log('Member data:', memberId, member);
                    const displayName = member.name || member.email?.split('@')[0] || `User ${memberId.substring(0, 8)}` || 'Unknown Member';
                    const isOnline = member.timestamp && (Date.now() - member.timestamp < 60000);
                    return (
                      <label key={memberId} className="member-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(memberId)}
                          onChange={() => handleMemberToggle(memberId)}
                        />
                        <span className="member-name">{displayName}</span>
                        <span className="member-status" title={isOnline ? 'Online' : 'Offline'}>
                          {isOnline ? '🟢 Online' : '🔴 Offline'}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {selectedMembers.size === 0 && membersList.length > 0 && (
                <p className="warning">⚠️ No members selected. Your location won't be visible to anyone.</p>
              )}
            </div>
          )}
        </div>

        <div className="privacy-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;