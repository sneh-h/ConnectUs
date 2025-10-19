import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { updateUserLocation, subscribeToGroupLocations, sendMessage, subscribeToMessages, sendEmergencyAlert, subscribeToEmergencyAlerts, acknowledgeAlert } from '../../firebase/location';
import { logout } from '../../firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import SimpleMembersPanel from '../panels/SimpleMembersPanel';
import AdminPanel from '../panels/AdminPanel';
import DemoMode from '../utils/DemoMode';
import './MapDashboard.css';
import 'leaflet/dist/leaflet.css';

// Custom colored markers with letters
const createColoredIcon = (color, letter) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; color: white; text-shadow: 2px 2px 2px rgba(0,0,0,0.8); z-index: 1000;">${letter}</div>`,
    iconSize: [35, 35],
    iconAnchor: [17, 17]
  });
};

const emergencyIcon = L.divIcon({
  className: 'emergency-marker',
  html: '<div style="background-color: #ff0000; width: 40px; height: 40px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 20px; animation: pulse 1s infinite; z-index: 1001;">🚨</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const MapDashboard = ({ currentGroup: initialGroup, onLeaveGroup, isAdmin = false }) => {
  const { user } = useAuth();
  const [currentGroup, setCurrentGroup] = useState(initialGroup);
  const [groupMembers, setGroupMembers] = useState({});
  const [myLocation, setMyLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 19.0760, lng: 72.8777 });
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [laggingDistance, setLaggingDistance] = useState(500); // meters
  const [memberColors, setMemberColors] = useState({});
  const [memberLetters, setMemberLetters] = useState({});
  const [myAddress, setMyAddress] = useState('');
  const [memberAddresses, setMemberAddresses] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showEnhancedMembers, setShowEnhancedMembers] = useState(true);
  const [demoUsers, setDemoUsers] = useState({});
  const [adminSettings, setAdminSettings] = useState({
    laggingAlerts: true,
    realNotifications: true,
    allowMemberAdditions: true
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [memberRequests, setMemberRequests] = useState([]);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [distanceValue, setDistanceValue] = useState(500);
  const [distanceUnit, setDistanceUnit] = useState('m');
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState(new Set());
  const [notifiedRequests, setNotifiedRequests] = useState(new Set());
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const chatMessagesRef = useRef(null);
  
  const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8844', '#8844ff'];
  
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
  
  // Computed values
  const onlineCount = Object.values(groupMembers).filter(member => 
    member.timestamp && (Date.now() - member.timestamp < 60000)
  ).length;
  
  const lastUpdateTime = myLocation ? getTimeAgo(myLocation.timestamp) : 'Never';
  
  const filteredMembers = Object.entries(groupMembers).filter(([userId, member]) => 
    (member.name || 'Unknown').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const generateUniqueInitials = (members) => {
    const initialsMap = {};
    const usedInitials = new Set();
    
    Object.entries(members).forEach(([userId, member]) => {
      const name = member.name || 'Unknown';
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
  
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      
      if (data && data.display_name) {
        const address = data.address || {};
        const parts = [];
        
        if (address.house_number && address.road) {
          parts.push(`${address.house_number} ${address.road}`);
        } else if (address.road) {
          parts.push(address.road);
        }
        
        if (address.neighbourhood || address.suburb) {
          parts.push(address.neighbourhood || address.suburb);
        }
        
        if (address.city || address.town || address.village) {
          parts.push(address.city || address.town || address.village);
        }
        
        return parts.slice(0, 2).join(', ') || data.display_name.split(',').slice(0, 2).join(',');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return '';
  };

  const mapContainerStyle = {
    width: '100%',
    height: '500px'
  };

  useEffect(() => {
    let unsubscribeLocations = null;
    let unsubscribeMessages = null;
    let unsubscribeEmergency = null;

    if (currentGroup && user) {
      // Subscribe to group locations
      unsubscribeLocations = subscribeToGroupLocations(currentGroup, (snapshot) => {
        if (snapshot.exists()) {
          const members = snapshot.val();
          setGroupMembers(members);
          
          // Assign colors and generate unique initials
          const newColors = { ...memberColors };
          const allMembers = { ...members, ...demoUsers };
          const newLetters = generateUniqueInitials(allMembers);
          
          Object.entries(allMembers).forEach(([userId, member], index) => {
            if (!newColors[userId]) {
              newColors[userId] = colors[index % colors.length];
            }
          });
          setMemberColors(newColors);
          setMemberLetters(newLetters);
          
          // Auto-center map on user's location
          if (myLocation && mapRef.current) {
            mapRef.current.setView([myLocation.lat, myLocation.lng], 15);
          }
          
          // Check for lagging members (admin only)
          if (isAdmin && myLocation) {
            checkLaggingMembers(members);
          }
        }
      });
      
      // Subscribe to chat messages
      unsubscribeMessages = subscribeToMessages(currentGroup, (snapshot) => {
        if (snapshot.exists()) {
          const msgs = Object.values(snapshot.val()).sort((a, b) => a.timestamp - b.timestamp);
          setMessages(msgs);
        }
      });
      
      // Subscribe to emergency alerts
      unsubscribeEmergency = subscribeToEmergencyAlerts(currentGroup, (snapshot) => {
        if (snapshot.exists()) {
          const alertsData = snapshot.val();
          const alerts = Object.entries(alertsData).map(([id, alert]) => ({ id, ...alert }));
          
          // Filter out alerts acknowledged by all members
          const activeAlerts = alerts.filter(alert => {
            const acknowledgedCount = alert.acknowledged ? Object.keys(alert.acknowledged).length : 0;
            const totalMembers = Object.keys(groupMembers).length;
            return acknowledgedCount < totalMembers;
          });
          
          const newAlerts = activeAlerts.filter(alert => 
            !emergencyAlerts.some(existing => existing.timestamp === alert.timestamp)
          );
          
          setEmergencyAlerts(activeAlerts);
          
          // Show notifications for new alerts (only if not acknowledged by current user)
          newAlerts.forEach(alert => {
            const isAlreadyAcknowledged = alert.acknowledged && alert.acknowledged[user.uid];
            const alertKey = `${alert.type}-${alert.userId}-${Math.floor(alert.timestamp / 60000)}`; // Group by minute
            
            if (!isAlreadyAcknowledged && !acknowledgedAlerts.has(alertKey)) {
              if (adminSettings.realNotifications && Notification.permission === 'granted') {
                let notification;
                if (alert.type === 'lagging') {
                  notification = new Notification('📍 Member Lagging Behind', { 
                    body: alert.message,
                    tag: `lagging-${alert.userId}`, // Prevent duplicates
                    requireInteraction: true
                  });
                } else {
                  notification = new Notification('🚨 Emergency Alert!', { 
                    body: alert.message || 'A group member needs help!',
                    tag: `emergency-${alert.userId}`,
                    requireInteraction: true
                  });
                }
                
                // Handle user interaction with notification
                notification.onclick = () => {
                  // User clicked notification - acknowledge the alert
                  handleAcknowledgeAlert(alert, alert.id);
                  notification.close();
                };
                
                notification.onclose = () => {
                  // User closed notification - acknowledge the alert
                  handleAcknowledgeAlert(alert, alert.id);
                  setActiveNotifications(prev => prev.filter(n => n !== notification));
                };
                
                // Store notification reference
                alert.notificationRef = notification;
                setActiveNotifications(prev => [...prev, notification]);
              }
              console.log('New alert added:', alert);
            }
          });
        }
      });

      // Start location tracking
      if (isTracking && navigator.geolocation) {
        const options = emergencyMode 
          ? { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
          : { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 };
          
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now(),
              name: user.email.split('@')[0],
              emergency: emergencyMode
            };
            
            setMyLocation(location);
            setMapCenter({ lat: location.lat, lng: location.lng });
            
            // Get address for my location
            getAddressFromCoords(location.lat, location.lng).then(address => {
              if (address) setMyAddress(address);
            });
            
            // Auto-center map on user's location
            if (mapRef.current) {
              mapRef.current.setView([location.lat, location.lng], 15);
            }
            
            updateUserLocation(user.uid, location);
          },
          (error) => console.error('Location error:', error),
          options
        );
      }
    }

    return () => {
      if (unsubscribeLocations) unsubscribeLocations();
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeEmergency) unsubscribeEmergency();
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      // Clear alerts on cleanup
      setEmergencyAlerts([]);
    };
  }, [currentGroup, user, isTracking, emergencyMode, myLocation, isAdmin, demoUsers]);

  const handleLeaveGroup = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (onLeaveGroup) onLeaveGroup();
  };

  const handleLogout = async () => {
    try {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      // Clear all alerts and notifications
      setEmergencyAlerts([]);
      
      // Close all active browser notifications
      activeNotifications.forEach(notification => {
        try {
          notification.close();
        } catch (e) {
          // Notification might already be closed
        }
      });
      setActiveNotifications([]);
      
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleTracking = () => {
    setIsTracking(!isTracking);
  };
  
  const toggleEmergency = () => {
    const newEmergencyMode = !emergencyMode;
    setEmergencyMode(newEmergencyMode);
    
    if (newEmergencyMode) {
      // Send emergency alert
      sendEmergencyAlert(currentGroup, {
        userId: user.uid,
        name: user.email.split('@')[0],
        location: myLocation,
        timestamp: Date.now(),
        message: 'Emergency help needed!'
      });
      showNotification('🚨 Emergency Mode Activated', 'Your location is being shared with high frequency');
    }
  };
  
  const sendChatMessage = () => {
    if (newMessage.trim()) {
      sendMessage(currentGroup, {
        userId: user.uid,
        name: user.email.split('@')[0],
        message: newMessage,
        timestamp: Date.now()
      });
      setNewMessage('');
    }
  };
  
  const handleAcknowledgeAlert = async (alert, alertId) => {
    try {
      // Close the notification if it exists
      if (alert.notificationRef) {
        alert.notificationRef.close();
      }
      
      // Mark alert as acknowledged to prevent future notifications
      const alertKey = `${alert.type}-${alert.userId}-${Math.floor(alert.timestamp / 60000)}`;
      setAcknowledgedAlerts(prev => new Set([...prev, alertKey]));
      
      // For demo alerts, remove directly from state
      if (alertId && alertId.startsWith('demo_alert_')) {
        setEmergencyAlerts(prev => prev.filter(a => a.id !== alertId));
      } else {
        // For real alerts, use Firebase acknowledgment
        await acknowledgeAlert(currentGroup, alertId, user.uid);
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      // Fallback: remove from local state anyway
      setEmergencyAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };
  
  const checkLaggingMembers = (members) => {
    if (!myLocation || !adminSettings.laggingAlerts) return;
    
    // Find group center (average of all locations)
    const activeMemberLocations = Object.entries(members)
      .filter(([userId, member]) => member.lat && member.lng && (Date.now() - member.timestamp < 300000))
      .map(([userId, member]) => ({ userId, ...member }));
    
    if (activeMemberLocations.length < 2) return;
    
    const centerLat = activeMemberLocations.reduce((sum, member) => sum + member.lat, 0) / activeMemberLocations.length;
    const centerLng = activeMemberLocations.reduce((sum, member) => sum + member.lng, 0) / activeMemberLocations.length;
    
    // Check each member's distance from group center
    activeMemberLocations.forEach(member => {
      const distanceFromCenter = calculateDistance(centerLat, centerLng, member.lat, member.lng);
      
      if (distanceFromCenter > laggingDistance) {
        // Send lagging alert to all members (only if not already sent recently)
        const recentAlert = emergencyAlerts.find(alert => 
          alert.type === 'lagging' && 
          alert.userId === member.userId && 
          (Date.now() - alert.timestamp < 300000) // 5 minutes
        );
        
        if (!recentAlert) {
          sendEmergencyAlert(currentGroup, {
            type: 'lagging',
            userId: member.userId,
            name: member.name,
            distance: Math.round(distanceFromCenter),
            maxDistance: laggingDistance,
            location: { lat: member.lat, lng: member.lng },
            timestamp: Date.now(),
            message: `${member.name} is ${Math.round(distanceFromCenter)}m away from the group (limit: ${laggingDistance}m)`,
            acknowledged: {}
          });
        }
      }
    });
  };
  
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  };
  
  const showNotification = (title, body) => {
    if (Notification.permission === 'granted') {
      return new Notification(title, { body });
    }
    return null;
  };
  
  const handleApproveRequest = (requestId) => {
    const request = memberRequests.find(r => r.id === requestId);
    if (request) {
      // Remove from requests
      setMemberRequests(prev => prev.filter(r => r.id !== requestId));
      
      // Add as demo user to show in group
      const newMember = {
        id: `approved_${requestId}`,
        name: request.name,
        email: request.email,
        lat: myLocation ? myLocation.lat + (Math.random() - 0.5) * 0.01 : 19.0760,
        lng: myLocation ? myLocation.lng + (Math.random() - 0.5) * 0.01 : 72.8777,
        timestamp: Date.now(),
        battery: Math.floor(Math.random() * 100),
        accuracy: Math.floor(Math.random() * 50) + 10
      };
      
      setDemoUsers(prev => ({
        ...prev,
        [newMember.id]: newMember
      }));
      
      // Only show notification if not already notified
      if (!notifiedRequests.has(`approve_${requestId}`)) {
        showNotification('✓ Request Approved', `${request.name} has been added to the group`);
        setNotifiedRequests(prev => new Set([...prev, `approve_${requestId}`]));
      }
    }
  };
  
  const handleRejectRequest = (requestId) => {
    const request = memberRequests.find(r => r.id === requestId);
    if (request) {
      setMemberRequests(prev => prev.filter(r => r.id !== requestId));
      // Only show notification if not already notified
      if (!notifiedRequests.has(`reject_${requestId}`)) {
        showNotification('✕ Request Rejected', `${request.name}'s request was rejected`);
        setNotifiedRequests(prev => new Set([...prev, `reject_${requestId}`]));
      }
    }
  };
  

  
  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);
  
  // Auto-scroll chat
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const getMemberIcon = (member, userId) => {
    if (userId === user.uid) return '🟢';
    const isOnline = member.timestamp && (Date.now() - member.timestamp < 60000);
    return isOnline ? '🔵' : '⚫';
  };

  useEffect(() => {
    setCurrentGroup(initialGroup);
    
    // Add demo member requests for admin only
    if (isAdmin && initialGroup) {
      setTimeout(() => {
        setMemberRequests([
          {
            id: 'req_1',
            name: 'Rahul Sharma',
            email: 'rahul.sharma@example.com',
            timestamp: Date.now() - 300000, // 5 minutes ago
            message: 'Hi! I would like to join your group for the college trip.'
          },
          {
            id: 'req_2', 
            name: 'Priya Patel',
            email: 'priya.patel@example.com',
            timestamp: Date.now() - 120000, // 2 minutes ago
            message: 'Can I join your location sharing group?'
          }
        ]);
      }, 2000);
    }
  }, [initialGroup, isAdmin]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  if (!currentGroup) {
    return <div>Loading...</div>;
  }

  return (
    <div className="map-dashboard">
      {/* Header */}
      <div className="map-header">
        <div className="group-info">
          <div className="group-header-row">
            {isAdmin && (
              <button 
                className={`requests-btn ${memberRequests.length > 0 ? 'has-requests' : ''}`}
                onClick={() => setShowRequestsPanel(!showRequestsPanel)}
                title="Member Requests"
              >
                👥
                {memberRequests.length > 0 && (
                  <span className="requests-badge">{memberRequests.length}</span>
                )}
              </button>
            )}
            <h1 className="group-title">{currentGroup}</h1>
          </div>
          <div className="member-count">{Object.keys(groupMembers).length} members</div>
        </div>
        
        <div className="header-controls">
          <button 
            onClick={toggleTracking} 
            className={`control-btn ${isTracking ? 'active' : ''}`}
          >
            {isTracking ? '⏸️ Pause' : '▶️ Track'}
          </button>
          
          <button 
            onClick={toggleEmergency} 
            className={`control-btn emergency ${emergencyMode ? 'active' : ''}`}
          >
            {emergencyMode ? '🚨 Emergency ON' : '🚨 Emergency'}
          </button>
          
          <button 
            onClick={() => setShowChat(!showChat)} 
            className={`control-btn ${showChat ? 'active' : ''}`}
          >
            💬 Chat
          </button>
          

          
          <div className="profile-menu-container">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="profile-btn"
            >
              <div className="profile-avatar">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>
            
            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-info">
                  <div className="profile-name">{user?.email?.split('@')[0] || 'User'}</div>
                  <div className="profile-email">{user?.email}</div>
                </div>
                <div className="profile-actions">
                  <button onClick={() => { handleLeaveGroup(); setShowProfileMenu(false); }} className="dropdown-btn leave">
                    🚪 Leave Group
                  </button>
                  <button onClick={() => { handleLogout(); setShowProfileMenu(false); }} className="dropdown-btn logout">
                    ↗️ Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Member Requests Panel */}
      {isAdmin && showRequestsPanel && (
        <div className="requests-panel">
          <div className="requests-header">
            <div className="requests-tabs">
              <button 
                className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                👥 Requests ({memberRequests.length})
              </button>
              <button 
                className={`tab-btn ${activeTab === 'distance' ? 'active' : ''}`}
                onClick={() => setActiveTab('distance')}
              >
                📍 Distance
              </button>
            </div>
            <button 
              onClick={() => setShowRequestsPanel(false)}
              className="close-requests"
            >
              ✕
            </button>
          </div>
          <div className="tab-content">
            {activeTab === 'requests' && (
              <div className="requests-list">
                {memberRequests.length === 0 ? (
                  <div className="no-requests">
                    <p>No pending requests</p>
                  </div>
                ) : (
                  memberRequests.map(request => (
                    <div key={request.id} className="request-item">
                      <div className="request-info">
                        <div className="request-name">{request.name}</div>
                        <div className="request-email">{request.email}</div>
                        <div className="request-time">{getTimeAgo(request.timestamp)}</div>
                        {request.message && (
                          <div className="request-message">"{request.message}"</div>
                        )}
                      </div>
                      <div className="request-actions">
                        <button 
                          onClick={() => handleApproveRequest(request.id)}
                          className="approve-btn"
                        >
                          ✓ Accept
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(request.id)}
                          className="reject-btn"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {activeTab === 'distance' && (
              <div className="distance-settings">
                <div className="distance-setting-item">
                  <div className="setting-header">
                    <h4>📍 Lag Alert Distance</h4>
                    <p>Set maximum distance before triggering lagging alerts</p>
                  </div>
                  <div className="distance-control">
                    <div className="distance-input-group">
                      <input 
                        type="number" 
                        min="1" 
                        max="999" 
                        value={distanceValue}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setDistanceValue(value);
                          // Convert to meters for internal use
                          const meters = distanceUnit === 'km' ? value * 1000 : 
                                        distanceUnit === 'mi' ? value * 1609.34 : 
                                        distanceUnit === 'ft' ? value * 0.3048 : value;
                          setLaggingDistance(Math.round(meters));
                        }}
                        className="distance-number-input"
                        placeholder="Enter distance"
                      />
                      <select 
                        value={distanceUnit}
                        onChange={(e) => {
                          const newUnit = e.target.value;
                          setDistanceUnit(newUnit);
                          // Convert current distance to new unit
                          const meters = laggingDistance;
                          const newValue = newUnit === 'km' ? meters / 1000 : 
                                          newUnit === 'mi' ? meters / 1609.34 : 
                                          newUnit === 'ft' ? meters / 0.3048 : meters;
                          setDistanceValue(Math.round(newValue * 100) / 100);
                        }}
                        className="distance-unit-select"
                      >
                        <option value="m">meters</option>
                        <option value="km">kilometers</option>
                        <option value="ft">feet</option>
                        <option value="mi">miles</option>
                      </select>
                    </div>
                    <div className="current-distance">
                      <span>Current: {laggingDistance}m</span>
                    </div>
                  </div>
                  <div className="distance-presets">
                    <button onClick={() => { setDistanceValue(100); setDistanceUnit('m'); setLaggingDistance(100); }} className="preset-btn">Walking (100m)</button>
                    <button onClick={() => { setDistanceValue(500); setDistanceUnit('m'); setLaggingDistance(500); }} className="preset-btn">Hiking (500m)</button>
                    <button onClick={() => { setDistanceValue(1); setDistanceUnit('km'); setLaggingDistance(1000); }} className="preset-btn">Cycling (1km)</button>
                    <button onClick={() => { setDistanceValue(2); setDistanceUnit('km'); setLaggingDistance(2000); }} className="preset-btn">Driving (2km)</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="map-content">
        {/* Map */}
        <div className="map-container">
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={13}
            style={{ height: '500px', width: '100%' }}
            whenCreated={(map) => { mapRef.current = map; }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* My Location Marker */}
            {myLocation && (
              <Marker
                position={[myLocation.lat, myLocation.lng]}
                icon={emergencyMode ? emergencyIcon : createColoredIcon('#00ff88', memberLetters[user.uid] || 'ME')}
              >
                <Popup>
                  <div className="member-info-window">
                    <h3 style={{color: '#00ff88'}}>
                      📍 You {emergencyMode && ' 🚨'}
                    </h3>
                    {myAddress && <p><strong>📍 {myAddress}</strong></p>}
                    <p>Updated: {getTimeAgo(myLocation.timestamp)}</p>
                    <p>Accuracy: ±{myLocation.accuracy}m</p>
                    <p>Coordinates: {myLocation.lat.toFixed(6)}, {myLocation.lng.toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Other Members Markers */}
            {Object.entries({ ...groupMembers, ...demoUsers }).map(([userId, member]) => (
              member.lat && member.lng && userId !== user.uid && (
                <Marker
                  key={userId}
                  position={[member.lat, member.lng]}
                  icon={member.emergency ? emergencyIcon : createColoredIcon(memberColors[userId] || '#666666', memberLetters[userId] || '?')}
                >
                  <Popup>
                    <div className="member-info-window">
                      <h3 style={{color: memberColors[userId] || '#666666'}}>
                        {member.name || 'Unknown'}
                        {member.emergency && ' 🚨'}
                        {member.role === 'admin' && ' 👑'}
                        {userId.startsWith('demo_') && ' 🧪'}
                      </h3>
                      <p>Last seen: {getTimeAgo(member.timestamp)}</p>
                      <p>Accuracy: ±{member.accuracy}m</p>
                      {myLocation && (
                        <p>Distance: {calculateDistance(myLocation.lat, myLocation.lng, member.lat, member.lng).toFixed(0)}m away</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>

        {/* Side Panel */}
        <div className="side-panel" style={{ width: '350px' }}>
          {/* Demo Mode */}
          <DemoMode 
            onAddDemoUser={(user) => {
              setDemoUsers(prev => ({
                ...prev,
                [user.id]: user
              }));
            }}
            onRemoveDemoUser={(userId) => {
              setDemoUsers(prev => {
                const updated = { ...prev };
                delete updated[userId];
                return updated;
              });
            }}
            onTriggerLaggingAlert={(alert) => {
              console.log('Received lagging alert:', alert);
              const alertWithId = { ...alert, id: `demo_alert_${Date.now()}` };
              setEmergencyAlerts(prev => {
                // Check if similar alert already exists to prevent duplicates
                const existingAlert = prev.find(a => 
                  a.userId === alert.userId && 
                  a.type === alert.type &&
                  Math.abs(a.timestamp - alert.timestamp) < 5000
                );
                
                if (existingAlert) {
                  console.log('Duplicate alert prevented');
                  return prev;
                }
                
                const updated = [...prev, alertWithId];
                console.log('Updated emergency alerts:', updated);
                return updated;
              });
            }}
            demoUsers={demoUsers}
            currentUserLocation={myLocation}
          />
          

          
          {/* Admin Panel */}
          {isAdmin && (
            <AdminPanel 
              currentGroup={currentGroup}
              isAdmin={isAdmin}
              onMemberJoin={(newMember) => {
                console.log('New member joined:', newMember);
                // Handle new member joining
              }}
            />
          )}
          
          {/* Simple Members Panel */}
          <SimpleMembersPanel 
            members={{ ...groupMembers, ...demoUsers }}
            currentUser={{ uid: user.uid, role: isAdmin ? 'admin' : 'member', ...myLocation }}
            currentGroup={currentGroup}
            mapRef={mapRef}
            onMemberClick={(userId, member) => {
              console.log('Member clicked:', member.name || member.email);
              setSelectedMember(userId);
            }}
            onSendMessage={(userId, memberName) => {
              console.log('Send message to:', memberName);
              setShowChat(true);
              setNewMessage(`@${memberName} `);
            }}
          />

          {/* My Status */}
          <div className="status-panel">
            <h3>📍 Your Status</h3>
            <div className="status-info">
              <div className="status-item">
                <span className="status-label">Location Tracking:</span>
                <span className={`status-value ${isTracking ? 'active' : 'inactive'}`}>
                  {isTracking ? '🟢 Active' : '🔴 Paused'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Emergency Mode:</span>
                <span className={`status-value ${emergencyMode ? 'emergency-text' : 'inactive'}`}>
                  {emergencyMode ? '🚨 ACTIVE' : '⚫ Off'}
                </span>
              </div>
              {myLocation ? (
                <>
                  <div className="status-item">
                    <span className="status-label">Last Update:</span>
                    <span className="status-value">{getTimeAgo(myLocation.timestamp)}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Accuracy:</span>
                    <span className="status-value">±{myLocation.accuracy}m</span>
                  </div>
                  {myAddress && (
                    <div className="status-item">
                      <span className="status-label">Address:</span>
                      <span className="status-value address-text">{myAddress}</span>
                    </div>
                  )}
                  <div className="status-item coordinates">
                    <span className="status-label">Coordinates:</span>
                    <span className="status-value">{myLocation.lat.toFixed(6)}, {myLocation.lng.toFixed(6)}</span>
                  </div>
                </>
              ) : (
                <div className="status-item">
                  <span className="status-label">Location:</span>
                  <span className="status-value inactive">Not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Emergency Alerts */}
          {emergencyAlerts.length > 0 && (
            <div className="emergency-panel">
              <h3>🚨 Emergency Alerts</h3>
              {emergencyAlerts.map((alert, index) => {
                const isAcknowledged = alert.acknowledged && alert.acknowledged[user.uid];
                const acknowledgedCount = alert.acknowledged ? Object.keys(alert.acknowledged).length : 0;
                const totalMembers = Object.keys(groupMembers).length;
                
                return (
                  <div key={alert.id || index} className={`emergency-alert ${alert.type === 'lagging' ? 'lagging-alert' : ''} ${isAcknowledged ? 'acknowledged' : ''}`}>
                    <div className="alert-header">
                      <strong>{alert.type === 'lagging' ? '📍' : '🚨'} {alert.name}</strong>
                      <small>{getTimeAgo(alert.timestamp)}</small>
                    </div>
                    <p>{alert.message}</p>
                    {alert.type === 'lagging' && (
                      <div className="lagging-info">
                        <span>Distance: {alert.distance}m</span>
                        <span>Limit: {alert.maxDistance}m</span>
                      </div>
                    )}
                    <div className="alert-actions">
                      {!isAcknowledged && (
                        <button 
                          onClick={() => handleAcknowledgeAlert(alert, alert.id)}
                          className="ack-btn"
                        >
                          ✓ Got it
                        </button>
                      )}
                      <span className="ack-count">
                        {acknowledgedCount}/{totalMembers} seen
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Panel */}
      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3>💬 Group Chat</h3>
            <button onClick={() => setShowChat(false)} className="close-chat">✕</button>
          </div>
          <div className="chat-messages" ref={chatMessagesRef}>
            {messages.map((msg, index) => (
              <div key={index} className="chat-message">
                <div className="message-sender" style={{color: memberColors[msg.userId] || '#00ff88'}}>
                  {msg.name}
                </div>
                <div className="message-text">{msg.message}</div>
                <div className="message-time">{getTimeAgo(msg.timestamp)}</div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Type a message..."
            />
            <button onClick={sendChatMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDashboard;