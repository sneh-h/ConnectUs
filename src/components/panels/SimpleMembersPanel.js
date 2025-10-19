import React from 'react';
import './SimpleMembersPanel.css';

const SimpleMembersPanel = ({ members, currentUser, onMemberClick, onSendMessage, mapRef, currentGroup }) => {
  const memberGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ffa400 0%, #ff6b6b 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #91a7ff 100%)',
    'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
  ];

  const isOnline = (member) => {
    return member.timestamp && (Date.now() - member.timestamp < 60000);
  };

  const getOnlineStatus = (member) => {
    if (!member.timestamp) return { status: 'never', color: '#666', text: 'Never seen' };
    
    const timeDiff = Date.now() - member.timestamp;
    const minutes = Math.floor(timeDiff / 60000);
    
    if (minutes < 1) return { status: 'active', color: '#00ff88', text: 'Active now' };
    if (minutes < 5) return { status: 'recent', color: '#4ecdc4', text: 'Just left' };
    if (minutes < 60) return { status: 'offline', color: '#ffa500', text: `${minutes}m ago` };
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { status: 'away', color: '#ff6b6b', text: `${hours}h ago` };
    
    return { status: 'inactive', color: '#666', text: `${Math.floor(hours / 24)}d ago` };
  };

  const handleMemberClick = (userId, member) => {
    // Focus map on member location
    if (member.lat && member.lng && mapRef?.current) {
      mapRef.current.setView([member.lat, member.lng], 16);
    }
    
    // Call original click handler
    if (onMemberClick) {
      onMemberClick(userId, member);
    }
  };

  const handleSendMessage = (userId, memberName, e) => {
    e.stopPropagation(); // Prevent card click
    
    if (onSendMessage) {
      onSendMessage(userId, memberName);
      
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('💬 Message Sent', {
          body: `Message sent to ${memberName}`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  const getDistance = (member) => {
    if (!member?.lat || !member?.lng || !currentUser || !currentUser.lat || !currentUser.lng) return null;
    
    try {
      const R = 6371;
      const dLat = (member.lat - currentUser.lat) * Math.PI / 180;
      const dLon = (member.lng - currentUser.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(currentUser.lat * Math.PI / 180) * Math.cos(member.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      if (distance < 1) return `${Math.round(distance * 1000)}m`;
      return `${distance.toFixed(1)} km`;
    } catch (error) {
      return null;
    }
  };

  const getBatteryLevel = (member, isCurrentUser) => {
    if (member.battery) return member.battery;
    if (isCurrentUser && navigator.getBattery) {
      navigator.getBattery().then(battery => battery.level * 100);
    }
    return 85; // Default fallback
  };

  const getUniqueInitials = (members) => {
    const initialsMap = {};
    const usedInitials = new Set();
    
    Object.entries(members || {}).forEach(([userId, member]) => {
      const name = member.name || member.email?.split('@')[0] || 'Unknown';
      const words = name.trim().split(' ');
      
      let initials;
      if (words.length >= 2) {
        // First and last name initials
        initials = (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
      } else {
        // Single name - use first two characters
        initials = name.substring(0, 2).toUpperCase();
      }
      
      // Make unique if already used
      let uniqueInitials = initials;
      let counter = 1;
      while (usedInitials.has(uniqueInitials)) {
        uniqueInitials = initials.charAt(0) + counter;
        counter++;
      }
      
      usedInitials.add(uniqueInitials);
      initialsMap[userId] = uniqueInitials;
    });
    
    return initialsMap;
  };

  const totalMembers = Object.keys(members || {}).length;
  const onlineMembers = Object.values(members || {}).filter(m => isOnline(m)).length;
  const offlineMembers = totalMembers - onlineMembers;
  const memberInitials = getUniqueInitials(members);

  return (
    <div className="simple-members-panel">
      <h3>👥 Group Members ({totalMembers})</h3>
      
      <div className="group-stats">
        <div className="stat-box">
          <div className="stat-label">Total</div>
          <div className="stat-value">{totalMembers}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Online</div>
          <div className="stat-value">{onlineMembers}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Offline</div>
          <div className="stat-value">{offlineMembers}</div>
        </div>
      </div>

      <div className="members-section-title">Active Members</div>
      
      <div className="members-list">
        {Object.entries(members || {}).map(([userId, member], index) => {
          const memberGradient = memberGradients[index % memberGradients.length];
          const isCurrentUser = userId === currentUser?.uid;
          const online = isOnline(member);
          const distance = getDistance(member);
          const battery = getBatteryLevel(member, isCurrentUser);
          const initials = memberInitials[userId] || 'U';
          
          return (
            <div 
              key={userId} 
              className={`member-item ${isCurrentUser ? 'active' : ''} ${getOnlineStatus(member).status}`}
              onClick={() => handleMemberClick(userId, member)}
            >
              <div className="member-header">
                <div 
                  className="member-avatar"
                  style={{ background: memberGradient }}
                >
                  {initials}
                </div>
                <div className="member-info">
                  <div className="member-name">
                    {member.name || member.email?.split('@')[0] || 'Unknown'}
                    {member.role === 'admin' && (
                      <span className="admin-badge" title="Group Admin">
                        ★
                      </span>
                    )}
                  </div>
                  <div className="member-status">
                    <span 
                      className="status-dot" 
                      style={{ backgroundColor: getOnlineStatus(member).color }}
                    ></span>
                    <span 
                      className="status-text"
                      style={{ color: getOnlineStatus(member).color }}
                    >
                      {getOnlineStatus(member).text}
                    </span>
                    {(member.lat && member.lng) && (
                      <span className="location-indicator" title="Location shared">
                        📍
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="member-details">
                <div className="member-distance">
                  {isCurrentUser ? '📍 You' : 
                   distance ? `📍 ${distance}` : 
                   '📍 Unknown'}
                </div>
                <div className="member-actions">

                  <div className="member-battery">
                    <div className="battery-visual">
                      <div 
                        className={`battery-fill ${battery < 30 ? 'low' : battery < 70 ? 'mid' : ''}`}
                        style={{ width: `${battery}%` }}
                      ></div>
                    </div>
                    {battery}%
                  </div>
                </div>
              </div>
              {member.lat && member.lng && !userId.startsWith('demo_') && (
                <div className="member-location">
                  <span className="location-coords">
                    📍 {member.lat.toFixed(4)}, {member.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleMembersPanel;