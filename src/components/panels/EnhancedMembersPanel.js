import React, { useState, useEffect } from 'react';
import './EnhancedMembersPanel.css';

const EnhancedMembersPanel = ({ members, currentUser, onMemberClick, onMemberAction }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [searchTerm, setSearchTerm] = useState('');

  const memberColors = [
    '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', 
    '#54a0ff', '#5f27cd', '#00d2d3', '#ff6b6b', '#a55eea'
  ];

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getDistance = (member) => {
    if (!member.lat || !member.lng || !currentUser?.lat || !currentUser?.lng) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (member.lat - currentUser.lat) * Math.PI / 180;
    const dLon = (member.lng - currentUser.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(currentUser.lat * Math.PI / 180) * Math.cos(member.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  const isOnline = (member) => {
    return member.timestamp && (Date.now() - member.timestamp < 60000);
  };

  const filteredMembers = Object.entries(members || {})
    .filter(([userId, member]) => {
      if (filter === 'online' && !isOnline(member)) return false;
      if (filter === 'offline' && isOnline(member)) return false;
      if (searchTerm && !member.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort(([, a], [, b]) => {
      switch (sortBy) {
        case 'status':
          return isOnline(b) - isOnline(a);
        case 'distance':
          const distA = getDistance(a);
          const distB = getDistance(b);
          if (!distA && !distB) return 0;
          if (!distA) return 1;
          if (!distB) return -1;
          return parseFloat(distA) - parseFloat(distB);
        case 'lastSeen':
          return (b.timestamp || 0) - (a.timestamp || 0);
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

  const onlineCount = Object.values(members || {}).filter(isOnline).length;
  const totalCount = Object.keys(members || {}).length;

  return (
    <div className="enhanced-members-panel">
      {/* Header */}
      <div className="members-header">
        <div className="header-title">
          <h3>Group Members</h3>
          <div className="member-stats">
            <span className="stat online">{onlineCount} online</span>
            <span className="stat-divider">•</span>
            <span className="stat total">{totalCount} total</span>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-controls">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({totalCount})
          </button>
          <button 
            className={`filter-tab ${filter === 'online' ? 'active' : ''}`}
            onClick={() => setFilter('online')}
          >
            Online ({onlineCount})
          </button>
          <button 
            className={`filter-tab ${filter === 'offline' ? 'active' : ''}`}
            onClick={() => setFilter('offline')}
          >
            Offline ({totalCount - onlineCount})
          </button>
        </div>
        
        <select 
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="status">Sort by Status</option>
          <option value="distance">Sort by Distance</option>
          <option value="lastSeen">Sort by Last Seen</option>
        </select>
      </div>

      {/* Members List */}
      <div className="members-list-enhanced">
        {filteredMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>No members found</p>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="clear-search">
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredMembers.map(([userId, member], index) => {
            const memberColor = memberColors[index % memberColors.length];
            const isCurrentUser = userId === currentUser?.uid;
            const online = isOnline(member);
            const distance = getDistance(member);
            
            return (
              <div 
                key={userId} 
                className={`member-card-enhanced ${isCurrentUser ? 'current-user' : ''} ${online ? 'online' : 'offline'}`}
                onClick={() => onMemberClick?.(userId, member)}
              >
                {/* Avatar Section */}
                <div className="member-avatar-section">
                  <div 
                    className="member-avatar-enhanced"
                    style={{ backgroundColor: memberColor }}
                  >
                    <span className="avatar-text">
                      {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                    </span>
                    <div className={`status-ring ${online ? 'online' : 'offline'}`}></div>
                  </div>
                  
                  {isCurrentUser && (
                    <div className="current-user-badge">YOU</div>
                  )}
                  
                  {member.role === 'admin' && (
                    <div className="admin-badge">👑</div>
                  )}
                </div>

                {/* Member Info */}
                <div className="member-info-enhanced">
                  <div className="member-name-row">
                    <h4 className="member-name">
                      {member.name || member.email?.split('@')[0] || 'Unknown'}
                    </h4>
                    <div className="member-badges">
                      {online && <span className="online-badge">🟢</span>}
                      {member.emergency && <span className="emergency-badge">🚨</span>}
                    </div>
                  </div>
                  
                  <div className="member-details-row">
                    <div className="status-info">
                      <span className={`status-text ${online ? 'online' : 'offline'}`}>
                        {online ? 'Online' : 'Offline'}
                      </span>
                      {distance && (
                        <>
                          <span className="detail-separator">•</span>
                          <span className="distance-text">{distance} away</span>
                        </>
                      )}
                    </div>
                    
                    <div className="last-seen">
                      {getTimeAgo(member.timestamp)}
                    </div>
                  </div>
                  
                  {member.lat && member.lng && (
                    <div className="location-info">
                      <span className="location-icon">📍</span>
                      <span className="coordinates">
                        {member.lat.toFixed(4)}, {member.lng.toFixed(4)}
                      </span>
                      {member.accuracy && (
                        <span className="accuracy">±{Math.round(member.accuracy)}m</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="member-actions-enhanced">
                  {online && (
                    <button 
                      className="action-btn chat-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMemberAction?.('chat', userId, member);
                      }}
                      title="Send message"
                    >
                      💬
                    </button>
                  )}
                  
                  {member.lat && member.lng && (
                    <button 
                      className="action-btn locate-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMemberAction?.('locate', userId, member);
                      }}
                      title="Show on map"
                    >
                      🎯
                    </button>
                  )}
                  

                  
                  <button 
                    className="action-btn menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMemberAction?.('menu', userId, member);
                    }}
                    title="More options"
                  >
                    ⋮
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="members-footer">
        <div className="quick-stats">
          <div className="stat-item">
            <span className="stat-icon">🟢</span>
            <span className="stat-label">Active</span>
            <span className="stat-number">{onlineCount}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-icon">📍</span>
            <span className="stat-label">Located</span>
            <span className="stat-number">
              {Object.values(members || {}).filter(m => m.lat && m.lng).length}
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-icon">⚡</span>
            <span className="stat-label">Recent</span>
            <span className="stat-number">
              {Object.values(members || {}).filter(m => 
                m.timestamp && (Date.now() - m.timestamp < 300000)
              ).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMembersPanel;