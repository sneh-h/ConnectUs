import { useState, useEffect } from 'react';
import { updateUserLocation, subscribeToGroupLocations, joinGroup, createGroup, getGroupIdByCode } from '../../firebase/location';
import { realtimeDb } from '../../firebase/config';
import { logout } from '../../firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import MapDashboard from '../map/MapDashboard';
import JoinGroup from '../group/JoinGroup';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState('');
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState({});
  const [myLocation, setMyLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(() => localStorage.getItem('isTracking') === 'true');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [createdGroupCode, setCreatedGroupCode] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showMyGroups, setShowMyGroups] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [showJoinRequest, setShowJoinRequest] = useState(false);
  const [groupData, setGroupData] = useState(null);

  // Load user's existing groups and current group on component mount
  useEffect(() => {
    const loadUserGroups = async () => {
      if (!user) return;
      
      // Load current group from localStorage only for verified users
      const savedGroup = localStorage.getItem('currentGroup');
      if (savedGroup) {
        setCurrentGroup(savedGroup);
      }
      
      try {
        setLoadingGroups(true);
        const { get, ref } = await import('firebase/database');
        const groupsRef = ref(realtimeDb, 'groups');
        const snapshot = await get(groupsRef);
        
        if (snapshot.exists()) {
          const groups = [];
          snapshot.forEach(childSnapshot => {
            const groupData = childSnapshot.val();
            // Check if user is in the members object
            if (groupData.members && groupData.members[user.uid]) {
              groups.push({
                id: childSnapshot.key,
                ...groupData
              });
            }
          });
          setUserGroups(groups);
          console.log('Found user groups:', groups);
        } else {
          console.log('No groups found in database');
        }
      } catch (error) {
        console.error('Error loading user groups:', error);
      } finally {
        setLoadingGroups(false);
      }
    };
    
    loadUserGroups();
  }, [user]);

  // Listen for approval notifications when not in a group
  useEffect(() => {
    if (!currentGroup && user) {
      const checkApprovals = async () => {
        try {
          const { get, ref } = await import('firebase/database');
          const groupsRef = ref(realtimeDb, 'groups');
          const snapshot = await get(groupsRef);
          
          if (snapshot.exists()) {
            snapshot.forEach(groupSnapshot => {
              const groupData = groupSnapshot.val();
              const groupId = groupSnapshot.key;
              
              // Check if user was added to any group
              if (groupData.members && groupData.members[user.uid]) {
                const member = groupData.members[user.uid];
                if (member.joinedAt && member.joinedAt > (Date.now() - 60000)) {
                  // Recently added - show notification only, don't auto-join
                  if (Notification.permission === 'granted') {
                    new Notification('✅ Request Approved', {
                      body: `Welcome! Your request to join ${groupData.name || groupId} has been approved. Check your groups list.`,
                      requireInteraction: true
                    });
                  }
                  // Refresh user groups list instead of auto-joining
                  const loadUserGroups = async () => {
                    const groupsRef = ref(realtimeDb, 'groups');
                    const snapshot = await get(groupsRef);
                    
                    if (snapshot.exists()) {
                      const groups = [];
                      snapshot.forEach(childSnapshot => {
                        const groupData = childSnapshot.val();
                        if (groupData.members && groupData.members[user.uid]) {
                          groups.push({
                            id: childSnapshot.key,
                            ...groupData
                          });
                        }
                      });
                      setUserGroups(groups);
                    }
                  };
                  loadUserGroups();
                }
              }
            });
          }
        } catch (error) {
          console.error('Error checking approvals:', error);
        }
      };
      
      const interval = setInterval(checkApprovals, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [currentGroup, user]);

  useEffect(() => {
    let unsubscribe = null;
    let watchId = null;

    if (currentGroup && user) {
      // Subscribe to group locations
      unsubscribe = subscribeToGroupLocations(currentGroup, (snapshot) => {
        if (snapshot.exists()) {
          setGroupMembers(snapshot.val());
        }
      });

      // Start location tracking
      if (isTracking && navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now(),
              name: user.email.split('@')[0]
            };
            
            setMyLocation(location);
            updateUserLocation(user.uid, location);
          },
          (error) => console.error('Location error:', error),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [currentGroup, user, isTracking]);

  const handleSelectExistingGroup = (group) => {
    setCurrentGroup(group.id);
    localStorage.setItem('currentGroup', group.id);
    setIsTracking(true);
    localStorage.setItem('isTracking', 'true');
  };

  const generateGroupCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;
    
    const groupCode = generateGroupCode();
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await createGroup(groupId, user.uid, {
        code: groupCode,
        name: newGroupName,
        description: groupDescription,
        creator: user.uid,
        creatorEmail: user.email,
        createdAt: Date.now()
      });
      
      await joinGroup(groupId, user.uid, {
        name: user.email.split('@')[0],
        email: user.email,
        role: 'admin',
        joinedAt: Date.now()
      }, true);
      
      setCreatedGroupCode(groupCode);
      setShowShareModal(true);
      setShowCreateGroup(false);
    } catch (error) {
      alert('Failed to create group: ' + error.message);
    }
  };
  
  const handleJoinCreatedGroup = async () => {
    try {
      const actualGroupId = await getGroupIdByCode(createdGroupCode);
      if (actualGroupId) {
        // You're already in the group as admin from creation, just set current group
        setCurrentGroup(actualGroupId);
        localStorage.setItem('currentGroup', actualGroupId);
        setIsTracking(true);
        localStorage.setItem('isTracking', 'true');
      }
    } catch (error) {
      console.error('Error joining created group:', error);
    }
    setShowShareModal(false);
    setNewGroupName('');
    setGroupDescription('');
    setCreatedGroupCode('');
  };
  
  const shareGroup = () => {
    const shareText = `🎆 Join my ConnectUs group!\n\n📍 Group: ${newGroupName}\n${groupDescription ? `📝 ${groupDescription}\n` : ''}🔑 Code: ${createdGroupCode}\n\n👥 Use this code to join our live location tracking group on ConnectUs!`;
    
    if (navigator.share) {
      navigator.share({
        title: `Join ${newGroupName} on ConnectUs`,
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Group details copied to clipboard!');
    }
  };

  const handleLeaveGroup = () => {
    setCurrentGroup(null);
    localStorage.removeItem('currentGroup');
    setIsTracking(false);
    localStorage.removeItem('isTracking');
    setGroupMembers({});
    setMyLocation(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Load group data to check creator
  useEffect(() => {
    const loadGroupData = async () => {
      if (currentGroup && user) {
        const { get, ref } = await import('firebase/database');
        const groupRef = ref(realtimeDb, `groups/${currentGroup}`);
        const snapshot = await get(groupRef);
        if (snapshot.exists()) {
          setGroupData(snapshot.val());
        }
      }
    };
    loadGroupData();
  }, [currentGroup, user]);

  if (currentGroup) {
    // Check if user is admin by role OR if user is the group creator
    const memberRole = groupMembers[user?.uid]?.role || groupData?.members?.[user?.uid]?.role;
    const isCreator = groupData && (groupData.creator === user?.uid || groupData.creatorEmail === user?.email);
    const isAdmin = memberRole === 'admin' || isCreator;
    
    console.log('Admin check:', { 
      userId: user?.uid, 
      memberRole, 
      isCreator, 
      groupCreator: groupData?.creator,
      groupCreatorEmail: groupData?.creatorEmail,
      userEmail: user?.email,
      isAdmin 
    });
    
    return <MapDashboard currentGroup={currentGroup} onLeaveGroup={handleLeaveGroup} isAdmin={isAdmin} />;
  }

  if (!currentGroup) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            Connect<span className="title-accent">Us</span>
          </h1>
          <button onClick={handleLogout} className="logout-btn">
            ▷ Logout
          </button>
        </div>

        <div className="join-group-section">
          <div className="welcome-header">
            <div className="user-avatar">{user?.email?.charAt(0).toUpperCase()}</div>
            <h1 className="page-title">Welcome back, {user?.email?.split('@')[0]}!</h1>
            <p className="page-subtitle">Ready for your next adventure? Choose your path below</p>
          </div>

          <div className={`options-container ${expandedCard ? 'has-expanded' : ''}`}>
            <div className={`option-card join-card ${expandedCard === 'join' ? 'expanded' : expandedCard ? 'blurred' : ''}`}>
              <div className="card-header">
                <div className="card-icon">🎯</div>
                <div className="card-badge">QUICK START</div>
              </div>
              <h3>Join Adventure</h3>
              <p>Connect with friends who are already tracking</p>
            
              <div className="input-section">
                <label className="input-label">Group Code</label>
                <div className="enhanced-input">
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value.toUpperCase())}
                    className="group-code-input"
                    maxLength="15"
                  />
                </div>
              </div>
              
              <button 
                onClick={async () => {
                  if (!groupId.trim()) {
                    alert('Please enter a group code first');
                    return;
                  }
                  
                  try {
                    const { sendMemberRequest, getGroupIdByCode } = await import('../../firebase/location');
                    const actualGroupId = await getGroupIdByCode(groupId.trim());
                    if (!actualGroupId) {
                      alert('Group not found');
                      return;
                    }
                    
                    await sendMemberRequest(actualGroupId, {
                      userId: user.uid,
                      name: user.email.split('@')[0],
                      email: user.email,
                      message: 'Please add me to the group'
                    });
                    
                    alert('✅ Join request sent! Admin will be notified.');
                    setGroupId('');
                  } catch (error) {
                    alert('❌ Error: ' + error.message);
                  }
                }} 
                className="option-btn join-btn"
              >
                <span className="btn-icon">🚀</span>
                Send Join Request
              </button>
            </div>

            {!loadingGroups && userGroups.length > 0 && (
              <div className={`option-card my-groups-card ${expandedCard === 'groups' ? 'expanded' : expandedCard ? 'blurred' : ''}`}>
                {expandedCard !== 'groups' && (
                  <>
                    <div className="card-header">
                      <div className="card-icon">📁</div>
                      <div className="card-badge">MY GROUPS</div>
                    </div>
                    <h3>My Adventures</h3>
                    <p>Continue with your existing groups</p>
                  </>
                )}
                
                {expandedCard !== 'groups' ? (
                  <>
                    <div className="groups-preview">
                      <div className="preview-header">You have {userGroups.length} group{userGroups.length !== 1 ? 's' : ''}:</div>
                      <div className="preview-items">
                        {userGroups.slice(0, 2).map(group => {
                          const memberData = group.members?.[user.uid];
                          const isAdmin = memberData?.role === 'admin';
                          return (
                            <div key={group.id} className="preview-item">
                              <span className="preview-icon">🎆</span>
                              <span>{group.name} {isAdmin && '(Admin)'}</span>
                            </div>
                          );
                        })}
                        {userGroups.length > 2 && (
                          <div className="preview-item">
                            <span className="preview-icon">+</span>
                            <span>{userGroups.length - 2} more...</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setExpandedCard('groups')} 
                      className="option-btn my-groups-btn"
                    >
                      <span className="btn-icon">📁</span>
                      View My Groups
                    </button>
                  </>
                ) : null}
                
                {expandedCard === 'groups' && (
                  <div className="expanded-content">
                    <div className="expanded-header">
                      <h3>📁 My Groups</h3>
                      <button onClick={() => setExpandedCard(null)} className="close-btn">← Back</button>
                    </div>
                    <div className="groups-grid">
                      {userGroups.map(group => {
                        const memberData = group.members?.[user.uid];
                        const isAdmin = memberData?.role === 'admin';
                        return (
                          <div key={group.id} className="group-grid-item" onClick={() => handleSelectExistingGroup(group)}>
                            <div className="group-name">
                              {group.name}
                              {isAdmin && <span className="admin-indicator">ADMIN</span>}
                            </div>
                            <div className="group-code">Code: {group.code}</div>
                            {group.description && <div className="group-desc">{group.description}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={`option-card create-card ${expandedCard === 'create' ? 'expanded' : expandedCard ? 'blurred' : ''}`}>
              {expandedCard !== 'create' && (
                <>
                  <div className="card-header">
                    <div className="card-icon">⭐</div>
                    <div className="card-badge">LEADER</div>
                  </div>
                  <h3>Start New Adventure</h3>
                  <p>Be the leader and create your own tracking group</p>
                </>
              )}
              
              {expandedCard !== 'create' ? (
                <>
                  <div className="create-preview">
                    <div className="preview-header">What you'll get:</div>
                    <div className="preview-items">
                      <div className="preview-item">
                        <span className="preview-icon">🔗</span>
                        <span>Shareable group code</span>
                      </div>
                      <div className="preview-item">
                        <span className="preview-icon">👥</span>
                        <span>Unlimited members</span>
                      </div>
                      <div className="preview-item">
                        <span className="preview-icon">⚙️</span>
                        <span>Full control</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setExpandedCard('create')} 
                    className="option-btn create-btn"
                  >
                    <span className="btn-icon">✨</span>
                    Start Creating
                  </button>
                </>
              ) : null}
              
              {expandedCard === 'create' && (
                <div className="expanded-content">
                  <div className="create-form-enhanced">
                    <div className="input-section">
                      <label className="input-label">Adventure Name</label>
                      <div className="enhanced-input">
                        <input
                          type="text"
                          placeholder="e.g., Weekend Hike, Family Trip"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="group-name-input"
                          maxLength="25"
                        />
                        <div className="char-counter">{newGroupName.length}/25</div>
                      </div>
                    </div>
                    
                    <div className="input-section">
                      <label className="input-label">Description (Optional)</label>
                      <div className="enhanced-input">
                        <textarea
                          placeholder="Brief description of your adventure..."
                          value={groupDescription}
                          onChange={(e) => setGroupDescription(e.target.value)}
                          className="group-description-input"
                          maxLength="100"
                          rows="2"
                        />
                        <div className="char-counter">{groupDescription.length}/100</div>
                      </div>
                    </div>
                    
                    <div className="action-buttons">
                      <button onClick={handleCreateGroup} className="option-btn create-btn">
                        <span className="btn-icon">🚀</span>
                        Create
                      </button>
                      <button 
                        onClick={() => {setExpandedCard(null); setNewGroupName(''); setGroupDescription('');}} 
                        className="option-btn cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              

            </div>
          </div>
        </div>
        
        {/* My Groups Modal */}
        {showMyGroups && (
          <div className="modal-overlay">
            <div className="groups-modal">
              <div className="modal-header">
                <h3>📁 My Groups</h3>
                <button onClick={() => setShowMyGroups(false)} className="close-btn">✕</button>
              </div>
              
              <div className="groups-grid-modal">
                {userGroups.map(group => {
                  const memberData = group.members?.[user.uid];
                  const isAdmin = memberData?.role === 'admin';
                  return (
                    <div key={group.id} className="group-grid-item" onClick={() => handleSelectExistingGroup(group)}>
                      <div className="group-name">
                        {group.name}
                        {isAdmin && <span className="admin-indicator">ADMIN</span>}
                      </div>
                      <div className="group-code">Code: {group.code}</div>
                      {group.description && <div className="group-desc">{group.description}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="modal-overlay">
            <div className="create-modal">
              <div className="modal-header">
                <h3>✨ Create New Group</h3>
                <button onClick={() => setShowCreateGroup(false)} className="close-btn">✕</button>
              </div>
              
              <div className="create-form-enhanced">
                <div className="input-section">
                  <label className="input-label">Adventure Name</label>
                  <div className="enhanced-input">
                    <input
                      type="text"
                      placeholder="e.g., Weekend Hike, Family Trip"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="group-name-input"
                      maxLength="25"
                    />
                    <div className="char-counter">{newGroupName.length}/25</div>
                  </div>
                </div>
                
                <div className="input-section">
                  <label className="input-label">Description (Optional)</label>
                  <div className="enhanced-input">
                    <textarea
                      placeholder="Brief description of your adventure..."
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      className="group-description-input"
                      maxLength="100"
                      rows="2"
                    />
                    <div className="char-counter">{groupDescription.length}/100</div>
                  </div>
                </div>
                
                <div className="action-buttons">
                  <button onClick={handleCreateGroup} className="option-btn create-btn">
                    <span className="btn-icon">🚀</span>
                    Create
                  </button>
                  <button 
                    onClick={() => {setShowCreateGroup(false); setNewGroupName(''); setGroupDescription('');}} 
                    className="option-btn cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Join Request Modal */}
        {showJoinRequest && (
          <JoinGroup 
            groupCode={groupId}
            onJoinSuccess={() => {
              setShowJoinRequest(false);
              setGroupId('');
              alert('Join request sent! You will be notified when approved.');
            }}
            onCancel={() => setShowJoinRequest(false)}
          />
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="modal-overlay">
            <div className="share-modal">
              <div className="modal-header">
                <h3>🎆 Group Created Successfully!</h3>
                <button onClick={() => setShowShareModal(false)} className="close-btn">✕</button>
              </div>
              
              <div className="group-details">
                <div className="group-info-card">
                  <div className="group-name">{newGroupName}</div>
                  {groupDescription && <div className="group-desc">{groupDescription}</div>}
                  <div className="group-code-display">
                    <span className="code-label">Group Code:</span>
                    <span className="code-value">{createdGroupCode}</span>
                  </div>
                </div>
              </div>
              
              <div className="share-options">
                <button onClick={shareGroup} className="share-btn">
                  <span className="btn-icon">📤</span>
                  Share Group
                </button>
                
                <button onClick={() => {
                  navigator.clipboard.writeText(createdGroupCode);
                  alert('Code copied!');
                }} className="copy-btn">
                  <span className="btn-icon">📋</span>
                  Copy Code
                </button>
              </div>
              
              <div className="modal-actions">
                <button onClick={handleJoinCreatedGroup} className="join-now-btn">
                  <span className="btn-icon">🚀</span>
                  Start Tracking Now
                </button>
                
                <button onClick={() => {
                  setShowShareModal(false);
                  setNewGroupName('');
                  setGroupDescription('');
                  setCreatedGroupCode('');
                }} className="later-btn">
                  Share Later
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="group-info">
          <h1 className="dashboard-title">
            Connect<span className="title-accent">Us</span>
          </h1>
          <div className="group-details">
            <span className="group-id">🎆 {currentGroup}</span>
            <span className={`tracking-status ${isTracking ? 'active' : 'inactive'}`}>
              {isTracking ? '🟢 TRACKING' : '🔴 PAUSED'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={handleLeaveGroup} className="leave-btn">
            🚪 Leave Group
          </button>
          <button onClick={handleLogout} className="logout-btn">
            ▷ Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="my-location-card">
          <h3>📍 My Location</h3>
          {myLocation ? (
            <div className="location-info">
              <div className="coordinates">
                <span>Lat: {myLocation.lat.toFixed(6)}</span>
                <span>Lng: {myLocation.lng.toFixed(6)}</span>
              </div>
              <div className="accuracy">
                Accuracy: ±{myLocation.accuracy}m
              </div>
              <div className="timestamp">
                Updated: {getTimeAgo(myLocation.timestamp)}
              </div>
            </div>
          ) : (
            <div className="no-location">
              {isTracking ? 'Getting location...' : 'Location tracking disabled'}
            </div>
          )}
        </div>

        <div className="group-members-card">
          <h3>👥 Adventure Buddies ({Object.keys(groupMembers).length})</h3>
          <div className="members-list">
            {Object.entries(groupMembers).map(([userId, member]) => (
              <div key={userId} className={`member-item ${userId === user.uid ? 'me' : ''}`}>
                <div className="member-info">
                  <div className="member-name">
                    {member.name || member.email?.split('@')[0] || 'Unknown'}
                    {userId === user.uid && <span className="me-badge">(You)</span>}
                  </div>
                  {member.lat && member.lng && (
                    <div className="member-location">
                      <span>Lat: {member.lat.toFixed(6)}</span>
                      <span>Lng: {member.lng.toFixed(6)}</span>
                      <span className="last-seen">
                        {getTimeAgo(member.timestamp)}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`status-dot ${member.timestamp && (Date.now() - member.timestamp < 60000) ? 'online' : 'offline'}`}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="tracking-controls">
          <button 
            onClick={() => {
              const newTracking = !isTracking;
              setIsTracking(newTracking);
              localStorage.setItem('isTracking', newTracking.toString());
            }} 
            className={`tracking-btn ${isTracking ? 'stop' : 'start'}`}
          >
            {isTracking ? '⏸️ Pause Tracking' : '🎆 Start Tracking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;