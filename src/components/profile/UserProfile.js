import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ref, set, get } from 'firebase/database';
import { deleteUser } from 'firebase/auth';
import { realtimeDb } from '../../firebase/config';
import './UserProfile.css';

const UserProfile = ({ onClose, onLogout, onLeaveGroup }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    displayName: '',
    privacyLevel: 'group',
  });
  const [stats, setStats] = useState({
    totalDistance: 0,
    totalTime: 0,
    groupsJoined: 0,
    emergencyCount: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadUserStats();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const profileRef = ref(realtimeDb, `users/${user.uid}/profile`);
      const snapshot = await get(profileRef);
      if (snapshot.exists()) {
        setProfile(snapshot.val());
      } else {
        setProfile({
          displayName: user.email.split('@')[0],
          privacyLevel: 'group'
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;
    try {
      // Get stats from user profile
      const statsRef = ref(realtimeDb, `users/${user.uid}/stats`);
      const snapshot = await get(statsRef);
      
      if (snapshot.exists()) {
        setStats(snapshot.val());
      } else {
        // Calculate basic stats from groups
        const groupsRef = ref(realtimeDb, 'groups');
        const groupsSnapshot = await get(groupsRef);
        let groupsJoined = 0;
        
        if (groupsSnapshot.exists()) {
          groupsSnapshot.forEach(groupSnapshot => {
            const groupData = groupSnapshot.val();
            if (groupData.members && groupData.members[user.uid]) {
              groupsJoined++;
            }
          });
        }
        
        const calculatedStats = {
          totalDistance: Math.floor(Math.random() * 50000), // Simulated for demo
          totalTime: Math.floor(Math.random() * 1440), // Simulated for demo
          groupsJoined,
          emergencyCount: 0
        };
        
        setStats(calculatedStats);
        
        // Save calculated stats
        await set(statsRef, calculatedStats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profileRef = ref(realtimeDb, `users/${user.uid}/profile`);
      await set(profileRef, profile);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Error updating profile: ' + error.message);
    }
    setLoading(false);
  };

  const exportData = async () => {
    if (!user) return;
    try {
      const userRef = ref(realtimeDb, `users/${user.uid}`);
      const snapshot = await get(userRef);
      const data = {
        profile: snapshot.val(),
        exportDate: new Date().toISOString(),
        email: user.email
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connectus-data-${user.uid}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting data: ' + error.message);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
      alert('Account deletion cancelled.');
      return;
    }

    setLoading(true);
    try {
      const userRef = ref(realtimeDb, `users/${user.uid}`);
      await set(userRef, null);
      await deleteUser(user);
      alert('Account deleted successfully.');
    } catch (error) {
      alert('Error deleting account: ' + error.message);
      setLoading(false);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="profile-overlay">
      <div className="profile-modal">
        <div className="profile-header">
          <h2>⚙ User Profile</h2>
          <button onClick={onClose} className="close-profile">×</button>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h3>▷ Display Name</h3>
            <div className="name-input-group">
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                placeholder="Your display name"
                className="profile-input name-input"
              />
              <button onClick={saveProfile} className="set-name-btn" disabled={loading}>
                {loading ? '...' : 'Set'}
              </button>
            </div>
          </div>



          <div className="profile-section">
            <h3>▣ Activity Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{(stats.totalDistance / 1000).toFixed(1)} km</div>
                <div className="stat-label">Distance Traveled</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{formatTime(stats.totalTime)}</div>
                <div className="stat-label">Time Tracked</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.groupsJoined}</div>
                <div className="stat-label">Groups Joined</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.emergencyCount}</div>
                <div className="stat-label">Emergency Alerts</div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>▷ Account Actions</h3>
            <div className="account-actions">
              <button onClick={() => { onLeaveGroup(); onClose(); }} className="leave-group-btn coral-btn">
                ← Leave Group
              </button>
              <button onClick={() => { onLogout(); onClose(); }} className="logout-profile-btn indigo-btn">
                ↗ Logout
              </button>
            </div>
          </div>

          <div className="profile-section">
            <h3>▤ Data Management</h3>
            <div className="data-actions">
              <button onClick={exportData} className="export-btn amber-btn">
                ↓ Export My Data
              </button>
              <button onClick={deleteAccount} className="delete-btn red-btn" disabled={loading}>
                × Delete Account
              </button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default UserProfile;