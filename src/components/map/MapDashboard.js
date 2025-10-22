import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { updateUserLocation, subscribeToGroupLocations, sendMessage, subscribeToMessages, sendEmergencyAlert, subscribeToEmergencyAlerts, acknowledgeAlert, subscribeToMemberRequests, approveMemberRequest, rejectMemberRequest, sendNotification, subscribeToNotifications, updateGroupMemberLocation, canViewLocation, updateGroupMemberLocationWithPrivacy } from '../../firebase/location';
import { ref, set } from 'firebase/database';
import { realtimeDb } from '../../firebase/config';
import { logout } from '../../firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import SimpleMembersPanel from '../panels/SimpleMembersPanel';
import DemoMode from '../DemoMode';
import UserProfile from '../profile/UserProfile';
import PrivacySettings from '../privacy/PrivacySettings';
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

// Map controller component to handle map reference
const MapController = ({ mapRef, setFollowMode }) => {
  const map = useMap();
  
  React.useEffect(() => {
    mapRef.current = map;
    
    // Add event listeners to detect manual map movement
    const handleMapMove = () => {
      setFollowMode(false);
    };
    
    map.on('drag', handleMapMove);
    map.on('zoom', handleMapMove);
    
    return () => {
      map.off('drag', handleMapMove);
      map.off('zoom', handleMapMove);
    };
  }, [map, mapRef, setFollowMode]);
  
  return null;
};

const MapDashboard = ({ currentGroup: initialGroup, onLeaveGroup, isAdmin = false }) => {
  const { user } = useAuth();
  const [currentGroup, setCurrentGroup] = useState(initialGroup);
  const [groupMembers, setGroupMembers] = useState({});
  const [myLocation, setMyLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(() => localStorage.getItem('isTracking') === 'true');
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
  const [notifiedApprovals, setNotifiedApprovals] = useState(new Set());
  const [emergencyIntervals, setEmergencyIntervals] = useState({});
  const [locationHistory, setLocationHistory] = useState([]);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [lowBatteryAlerts, setLowBatteryAlerts] = useState(new Set());
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [followMode, setFollowMode] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [filteredGroupMembers, setFilteredGroupMembers] = useState({});
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const emergencyAlertsRef = useRef([]);
  const emergencyIntervalsRef = useRef({});
  const notificationActiveRef = useRef(false);
  
  // Global function to stop all emergency notifications
  window.stopAllEmergencyNotifications = () => {
    console.log('STOPPING ALL emergency notifications');
    Object.values(emergencyIntervalsRef.current).forEach(intervalId => {
      clearInterval(intervalId);
    });
    emergencyIntervalsRef.current = {};
    notificationActiveRef.current = false;
    setEmergencyIntervals({});
  };
  
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
    let unsubscribeRequests = null;
    let unsubscribeNotifications = null;

    if (currentGroup && user) {
      // Subscribe to group locations with privacy filtering
      unsubscribeLocations = subscribeToGroupLocations(currentGroup, async (snapshot) => {
        if (snapshot.exists()) {
          const members = snapshot.val();
          const filtered = {};
          
          // Filter members based on privacy settings
          for (const [memberId, memberData] of Object.entries(members)) {
            const canView = await canViewLocation(currentGroup, memberId, user.uid);
            if (canView) {
              filtered[memberId] = memberData;
            }
          }
          
          setGroupMembers(filtered);
          
          // Update member colors and letters for all members (including filtered ones)
          const allMembers = { ...filtered, ...demoUsers };
          const newColors = { ...memberColors };
          const newLetters = generateUniqueInitials(allMembers);
          
          Object.entries(allMembers).forEach(([userId, member], index) => {
            if (!newColors[userId]) {
              newColors[userId] = colors[index % colors.length];
            }
            
            // Get address for each member if not already cached
            if (member.lat && member.lng && !memberAddresses[userId] && userId !== user.uid) {
              getAddressFromCoords(member.lat, member.lng).then(address => {
                if (address) {
                  setMemberAddresses(prev => ({
                    ...prev,
                    [userId]: address
                  }));
                }
              });
            }
          });
          
          setMemberColors(newColors);
          setMemberLetters(newLetters);
          
          // Check for lagging members (admin only)
          if (isAdmin && myLocation) {
            checkLaggingMembers(filtered);
          }
        }
      });

      // Subscribe to member requests (admin only)
      if (isAdmin) {
        unsubscribeRequests = subscribeToMemberRequests(currentGroup, (snapshot) => {
          if (snapshot.exists()) {
            const requests = Object.entries(snapshot.val())
              .map(([id, request]) => ({ id, ...request }))
              .filter(request => request.status === 'pending');
            
            // Check for new requests
            const newRequests = requests.filter(request => {
              const requestKey = `new_request_${request.id}`;
              return !notifiedRequests.has(requestKey);
            });
            
            // Show notifications for new requests only (once)
            newRequests.forEach(request => {
              const requestKey = `new_request_${request.id}`;
              if (Notification.permission === 'granted') {
                new Notification('👥 New Member Request', {
                  body: `${request.name} wants to join the group`,
                  tag: requestKey,
                  requireInteraction: true
                });
              }
              setNotifiedRequests(prev => new Set([...prev, requestKey]));
            });
            
            setMemberRequests(requests);
          } else {
            setMemberRequests([]);
          }
        });
      }
      
      // Subscribe to notifications for all users
      unsubscribeNotifications = subscribeToNotifications(currentGroup, user.uid, (snapshot) => {
        const notifications = snapshot.val();
        if (notifications && Array.isArray(notifications)) {
          notifications.forEach(notif => {
            // Show browser notification for request approvals (once only)
            if (notif.type === 'request_approved' && notif.userId === user.uid) {
              const approvalKey = `approval_${notif.timestamp}`;
              if (!notifiedApprovals.has(approvalKey)) {
                console.log('✅ Showing approval notification for user');
                if (Notification.permission === 'granted') {
                  new Notification('✅ Request Approved', {
                    body: `Welcome! Your request to join ${currentGroup} has been approved.`,
                    requireInteraction: true
                  });
                }
                setNotifiedApprovals(prev => new Set([...prev, approvalKey]));
              }
            }
          });
        }
      });
      
      // Subscribe to chat messages
      unsubscribeMessages = subscribeToMessages(currentGroup, (snapshot) => {
        if (snapshot.exists()) {
          const msgs = Object.values(snapshot.val()).sort((a, b) => a.timestamp - b.timestamp);
          const newMessages = msgs.filter(msg => 
            msg.userId !== user.uid && 
            msg.timestamp > (Date.now() - 60000) && 
            !messages.some(existing => existing.timestamp === msg.timestamp)
          );
          
          // Show browser notifications for new messages
          newMessages.forEach(msg => {
            if (Notification.permission === 'granted' && !showChat) {
              const notification = new Notification('💬 New Message', {
                body: `${msg.name}: ${msg.message}`,
                icon: '/favicon.ico'
              });
              
              notification.onclick = () => {
                setShowChat(true);
                notification.close();
              };
            }
          });
          
          // Update unread count if chat is closed
          if (!showChat && newMessages.length > 0) {
            setUnreadMessages(prev => prev + newMessages.length);
          }
          
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
          
          setEmergencyAlerts(activeAlerts);
          emergencyAlertsRef.current = activeAlerts;
          
          // Show notifications for ALL alerts immediately
          activeAlerts.forEach(alert => {
            const isAlreadyAcknowledged = alert.acknowledged && alert.acknowledged[user.uid];
            const alertKey = `${alert.type}-${alert.userId}-${alert.timestamp}`;
            
            if (!isAlreadyAcknowledged && !acknowledgedAlerts.has(alertKey)) {
              console.log('Processing new alert for user:', user.uid, alert);
              
              // Start repetitive notifications for ALL alert types
              let title, body;
              if (alert.type === 'emergency' || !alert.type) {
                title = '🚨 EMERGENCY ALERT!';
                body = alert.message || `${alert.name} needs immediate help!`;
              } else if (alert.type === 'low_battery') {
                title = '🔋 Low Battery Alert';
                body = alert.message;
              } else {
                title = '📍 Member Lagging Behind';
                body = alert.message;
              }
              
              console.log('Starting repetitive notifications for:', title);
              startRepetitiveEmergencyNotification({
                ...alert,
                title: title,
                message: body
              });
              
              setAcknowledgedAlerts(prev => new Set([...prev, alertKey]));
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
              emergency: emergencyMode,
              battery: batteryLevel
            };
            
            // Add to location history
            setLocationHistory(prev => {
              const newHistory = [...prev, {
                lat: location.lat,
                lng: location.lng,
                timestamp: location.timestamp,
                address: myAddress
              }].slice(-50); // Keep last 50 locations
              return newHistory;
            });
            
            // Check for low battery
            if (batteryLevel <= 20 && !lowBatteryAlerts.has(user.uid)) {
              sendEmergencyAlert(currentGroup, {
                type: 'low_battery',
                userId: user.uid,
                name: user.email.split('@')[0],
                battery: batteryLevel,
                location: location,
                timestamp: Date.now(),
                message: `⚠️ ${user.email.split('@')[0]}'s battery is low (${batteryLevel}%)`,
                acknowledged: {}
              });
              setLowBatteryAlerts(prev => new Set([...prev, user.uid]));
            }
            
            setMyLocation(location);
            setMapCenter({ lat: location.lat, lng: location.lng });
            
            // Get address for my location
            getAddressFromCoords(location.lat, location.lng).then(address => {
              if (address) setMyAddress(address);
            });
            
            // Auto-center map on user's location (only in follow mode)
            if (mapRef.current && followMode) {
              const map = mapRef.current;
              if (map && map.setView && map.getZoom) {
                map.setView([location.lat, location.lng], map.getZoom());
              }
            }
            
            updateUserLocation(user.uid, location);
            updateGroupMemberLocationWithPrivacy(currentGroup, user.uid, {
              ...location,
              name: user.email.split('@')[0],
              email: user.email,
              role: isAdmin ? 'admin' : 'member'
            });
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
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeNotifications) unsubscribeNotifications();
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
      
      // Clear all emergency notification intervals
      Object.values(emergencyIntervals).forEach(intervalId => {
        clearInterval(intervalId);
      });
      setEmergencyIntervals({});
      
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
    if (isTracking) {
      // Ask for confirmation before turning off tracking
      if (window.confirm('Are you sure you want to stop sharing your location? Your last known location will remain visible to others.')) {
        setIsTracking(false);
        localStorage.setItem('isTracking', 'false');
        // Mark user as offline but keep last location
        if (myLocation) {
          const locationRef = ref(realtimeDb, `groups/${currentGroup}/members/${user.uid}`);
          set(locationRef, {
            ...myLocation,
            offline: true,
            lastSeen: Date.now()
          });
        }
      }
    } else {
      setIsTracking(true);
      localStorage.setItem('isTracking', 'true');
    }
  };
  
  const toggleEmergency = () => {
    const newEmergencyMode = !emergencyMode;
    setEmergencyMode(newEmergencyMode);
    
    if (newEmergencyMode) {
      // Send emergency alert to all group members
      sendEmergencyAlert(currentGroup, {
        type: 'emergency',
        userId: user.uid,
        name: user.email.split('@')[0],
        location: myLocation,
        timestamp: Date.now(),
        message: `🚨 ${user.email.split('@')[0]} needs immediate help!`,
        acknowledged: {}
      });
      showNotification('🚨 Emergency Alert Sent', 'All group members have been notified');
    }
  };
  
  const removeMember = async (memberId) => {
    if (window.confirm('Remove this member from the group?')) {
      const memberRef = ref(realtimeDb, `groups/${currentGroup}/members/${memberId}`);
      await set(memberRef, null);
      showNotification('Member Removed', 'Member has been removed from the group');
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
  
  const startRepetitiveEmergencyNotification = (alert) => {
    console.log('Starting repetitive notifications for alert:', alert);
    
    // Prevent multiple notification intervals
    if (notificationActiveRef.current) {
      console.log('Notifications already active, skipping');
      return;
    }
    
    notificationActiveRef.current = true;
    const alertKey = `${alert.userId}-${alert.timestamp}`;
    
    // Clear any existing interval for this alert
    if (emergencyIntervalsRef.current[alertKey]) {
      console.log('Clearing existing interval for:', alertKey);
      clearInterval(emergencyIntervalsRef.current[alertKey]);
    }
    
    const stopNotifications = () => {
      console.log('STOPPING notifications for:', alertKey);
      if (emergencyIntervalsRef.current[alertKey]) {
        clearInterval(emergencyIntervalsRef.current[alertKey]);
        delete emergencyIntervalsRef.current[alertKey];
        console.log('Interval cleared and deleted');
      }
    };
    
    const showNotif = () => {
      if (Notification.permission === 'granted') {
        const notification = new Notification(alert.title || '🚨 EMERGENCY ALERT!', {
          body: alert.message || `${alert.name} needs immediate help!`,
          requireInteraction: true,
          icon: '/favicon.ico'
        });
        
        notification.onclick = () => {
          console.log('Notification clicked - stopping ALL');
          window.stopAllEmergencyNotifications();
          notification.close();
        };
        notification.onclose = () => {
          console.log('Notification closed - stopping ALL');
          window.stopAllEmergencyNotifications();
        };
      }
    };
    
    // Show first notification immediately
    showNotif();
    
    // Simple interval that just shows notifications every 3 seconds
    const intervalId = setInterval(() => {
      console.log('Interval firing for alert:', alert.title);
      showNotif();
    }, 3000);
    
    console.log('Created interval with ID:', intervalId);
    
    // Store interval reference
    emergencyIntervalsRef.current[alertKey] = intervalId;
    setEmergencyIntervals(prev => ({
      ...prev,
      [alertKey]: intervalId
    }));
  };
  
  const handleAcknowledgeAlert = async (alert, alertId) => {
    try {
      // Stop repetitive notifications
      const alertKey = `${alert.userId}-${alert.timestamp}`;
      console.log('Acknowledging alert:', alertKey);
      if (emergencyIntervalsRef.current[alertKey]) {
        clearInterval(emergencyIntervalsRef.current[alertKey]);
        delete emergencyIntervalsRef.current[alertKey];
        console.log('Cleared interval in handleAcknowledgeAlert');
        setEmergencyIntervals(prev => {
          const updated = { ...prev };
          delete updated[alertKey];
          return updated;
        });
      }
      
      // Close any active notifications
      if (alert.notificationRef) {
        alert.notificationRef.close();
      }
      
      // Mark alert as acknowledged
      const ackKey = `${alert.userId}-${alert.timestamp}`;
      setAcknowledgedAlerts(prev => new Set([...prev, ackKey]));
      
      // For demo alerts, remove directly from state
      if (alertId && alertId.startsWith('demo_alert_')) {
        setEmergencyAlerts(prev => prev.filter(a => a.id !== alertId));
      } else {
        // For real alerts, use Firebase acknowledgment
        await acknowledgeAlert(currentGroup, alertId, user.uid);
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
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
  
  const handleApproveRequest = async (requestId) => {
    const request = memberRequests.find(r => r.id === requestId);
    if (request) {
      try {
        // Approve in Firebase
        await approveMemberRequest(currentGroup, requestId, request.userId || `user_${Date.now()}`, {
          name: request.name,
          email: request.email,
          role: 'member'
        });
        
        // Send notification to Firebase for the approved user
        await sendNotification(currentGroup, {
          type: 'request_approved',
          userId: request.userId,
          title: '✅ Request Approved',
          message: `Welcome to ${currentGroup}! Your request has been approved.`,
          from: 'admin'
        });
        
        showNotification('✓ Request Approved', `${request.name} has been added to the group`);
      } catch (error) {
        console.error('Error approving request:', error);
        showNotification('❌ Error', 'Failed to approve request');
      }
    }
  };
  
  const handleRejectRequest = async (requestId) => {
    const request = memberRequests.find(r => r.id === requestId);
    if (request) {
      try {
        // Reject in Firebase
        await rejectMemberRequest(currentGroup, requestId);
        
        // Send notification to the rejected user
        await sendNotification(currentGroup, {
          type: 'request_rejected',
          userId: request.userId,
          title: '❌ Request Rejected',
          message: `Your request to join ${currentGroup} was not approved.`,
          from: 'admin'
        });
        
        showNotification('✕ Request Rejected', `${request.name}'s request was rejected`);
      } catch (error) {
        console.error('Error rejecting request:', error);
        showNotification('❌ Error', 'Failed to reject request');
      }
    }
  };
  

  
  // Request notification permission and get battery level
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
    
    // Get battery level
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    } else {
      // Simulate battery level for demo
      const simulateBattery = () => {
        setBatteryLevel(prev => Math.max(5, prev - Math.random() * 2));
      };
      const interval = setInterval(simulateBattery, 30000);
      return () => clearInterval(interval);
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
  }, [initialGroup]);

  // Demo chat message handler
  useEffect(() => {
    window.sendDemoChatMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };
    
    return () => {
      delete window.sendDemoChatMessage;
    };
  }, []);

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
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) setUnreadMessages(0);
            }} 
            className={`control-btn ${showChat ? 'active' : ''}`}
          >
            💬 Chat
            {unreadMessages > 0 && (
              <span className="chat-badge">{unreadMessages}</span>
            )}
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
                  <button onClick={() => { setShowProfile(true); setShowProfileMenu(false); }} className="dropdown-btn profile">
                    👤 Profile Settings
                  </button>
                  <button onClick={() => { setShowPrivacySettings(true); setShowProfileMenu(false); }} className="dropdown-btn privacy">
                    🔒 Privacy Settings
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
              <button 
                className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage')}
              >
                👥 Manage
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
                        onChange={(e) => setDistanceValue(Number(e.target.value))}
                        className="distance-number-input"
                        placeholder="Enter distance"
                      />
                      <select 
                        value={distanceUnit}
                        onChange={(e) => setDistanceUnit(e.target.value)}
                        className="distance-unit-select"
                      >
                        <option value="m">meters</option>
                        <option value="km">kilometers</option>
                        <option value="ft">feet</option>
                        <option value="mi">miles</option>
                      </select>
                      <button 
                        onClick={() => {
                          const meters = distanceUnit === 'km' ? distanceValue * 1000 : 
                                        distanceUnit === 'mi' ? distanceValue * 1609.34 : 
                                        distanceUnit === 'ft' ? distanceValue * 0.3048 : distanceValue;
                          setLaggingDistance(Math.round(meters));
                          showNotification('✓ Distance Set', `Lag alert distance set to ${distanceValue}${distanceUnit}`);
                        }}
                        className="set-distance-btn"
                      >
                        Set
                      </button>
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
            
            {activeTab === 'manage' && (
              <div className="member-management">
                <div className="management-header">
                  <h4>👥 Group Members</h4>
                  <p>Manage group members and their permissions</p>
                </div>
                <div className="member-list">
                  {Object.entries(groupMembers).length === 0 ? (
                    <div className="no-members">
                      <p>No members in group</p>
                    </div>
                  ) : (
                    Object.entries(groupMembers).map(([userId, member]) => (
                      <div key={userId} className="management-member-item">
                        <div className="member-info">
                          <div className="member-name">{member.name || 'Unknown'}</div>
                          <div className="member-email">{member.email || 'No email'}</div>
                          <div className="member-role">{member.role || 'member'}</div>
                        </div>
                        <div className="member-actions">
                          {userId !== user.uid && (
                            <button 
                              onClick={() => removeMember(userId)}
                              className="remove-btn"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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
          <div className="map-controls">
            <button 
              onClick={() => {
                if (myLocation && mapRef.current) {
                  const map = mapRef.current;
                  if (map && map.setView) {
                    map.setView([myLocation.lat, myLocation.lng], 16);
                    setFollowMode(true);
                  }
                }
              }}
              className="map-control-btn center-me"
              title="Center on Me"
            >
              🎯
            </button>
            

            
            <button 
              onClick={() => {
                if (mapRef.current) {
                  const map = mapRef.current;
                  const bounds = [];
                  if (myLocation) bounds.push([myLocation.lat, myLocation.lng]);
                  Object.values({ ...groupMembers, ...demoUsers }).forEach(member => {
                    if (member.lat && member.lng) bounds.push([member.lat, member.lng]);
                  });
                  if (bounds.length > 0 && map && map.fitBounds) {
                    map.fitBounds(bounds, { padding: [20, 20] });
                  }
                }
              }}
              className="map-control-btn fit-all"
              title="Fit All Members"
            >
              👥
            </button>
            

          </div>
          
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={13}
            style={{ height: '500px', width: '100%' }}
          >
            <MapController mapRef={mapRef} setFollowMode={setFollowMode} />
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
                    <p>Battery: {batteryLevel}% {batteryLevel <= 20 ? '🔋' : '🔋'}</p>
                    <p>Accuracy: ±{myLocation.accuracy}m</p>
                    <p>Coordinates: {myLocation.lat.toFixed(6)}, {myLocation.lng.toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Other Members Markers */}
            {Object.entries({ ...groupMembers, ...demoUsers }).map(([userId, member]) => {
              const isOffline = member.offline || (member.timestamp && (Date.now() - member.timestamp > 300000));
              const markerColor = isOffline ? '#666666' : (memberColors[userId] || '#666666');
              const markerIcon = member.emergency ? emergencyIcon : createColoredIcon(markerColor, memberLetters[userId] || '?');
              
              return member.lat && member.lng && userId !== user.uid && (
                <Marker
                  key={userId}
                  position={[member.lat, member.lng]}
                  icon={markerIcon}
                  opacity={isOffline ? 0.6 : 1}
                >
                  <Popup>
                    <div className="member-info-window">
                      <h3 style={{color: markerColor}}>
                        {member.name || 'Unknown'}
                        {member.emergency && ' 🚨'}
                        {member.role === 'admin' && ' 👑'}
                        {userId.startsWith('demo_') && ' 🧪'}
                        {isOffline && ' 🔴'}
                      </h3>
                      {memberAddresses[userId] && <p><strong>📍 {memberAddresses[userId]}</strong></p>}
                      <p>Status: {isOffline ? 'Offline' : 'Online'}</p>
                      <p>Last seen: {getTimeAgo(member.timestamp)}</p>
                      {member.battery && <p>Battery: {member.battery}% {member.battery <= 20 ? '🔋' : '🔋'}</p>}
                      <p>Accuracy: ±{member.accuracy}m</p>
                      {myLocation && (
                        <p>Distance: {calculateDistance(myLocation.lat, myLocation.lng, member.lat, member.lng).toFixed(0)}m away</p>
                      )}
                      <p>Coordinates: {member.lat.toFixed(6)}, {member.lng.toFixed(6)}</p>
                      {isAdmin && (
                        <button 
                          onClick={() => removeMember(userId)}
                          className="remove-member-btn"
                          style={{background: '#ff4444', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', marginTop: '8px'}}
                        >
                          Remove Member
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
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
              
              // Show browser notification
              if (Notification.permission === 'granted') {
                new Notification('📍 Member Lagging Behind', {
                  body: alert.message,
                  requireInteraction: true
                });
              }
              
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
          

          

          
          {/* Simple Members Panel */}
          <SimpleMembersPanel 
            members={{ ...groupMembers, ...demoUsers }}
            currentUser={{ uid: user.uid, role: isAdmin ? 'admin' : 'member', ...myLocation }}
            currentGroup={currentGroup}
            mapRef={mapRef}
            memberAddresses={memberAddresses}
            myAddress={myAddress}
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
                <span className="status-label">Battery Level:</span>
                <span className={`status-value ${batteryLevel <= 20 ? 'emergency-text' : 'active'}`}>
                  🔋 {batteryLevel}%
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
          
          {/* Location History */}
          {locationHistory.length > 0 && (
            <div className="history-panel">
              <h3>📍 Location History</h3>
              <div className="history-list">
                {locationHistory.slice(-5).reverse().map((loc, index) => (
                  <div key={index} className="history-item">
                    <div className="history-time">{new Date(loc.timestamp).toLocaleTimeString()}</div>
                    <div className="history-coords">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</div>
                    {loc.address && <div className="history-address">{loc.address}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          

          
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
                          onClick={() => {
                            // Stop repetitive notifications immediately
                            const alertKey = `${alert.userId}-${alert.timestamp}`;
                            if (emergencyIntervals[alertKey]) {
                              clearInterval(emergencyIntervals[alertKey]);
                              setEmergencyIntervals(prev => {
                                const updated = { ...prev };
                                delete updated[alertKey];
                                return updated;
                              });
                            }
                            handleAcknowledgeAlert(alert, alert.id);
                          }}
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

      {/* User Profile Modal */}
      {showProfile && (
        <UserProfile 
          onClose={() => setShowProfile(false)} 
          onLogout={handleLogout}
          onLeaveGroup={handleLeaveGroup}
        />
      )}
      
      {/* Privacy Settings Modal */}
      {showPrivacySettings && (
        <PrivacySettings 
          currentGroup={currentGroup}
          groupMembers={groupMembers}
          onClose={() => setShowPrivacySettings(false)}
        />
      )}
      

    </div>
  );
};

export default MapDashboard;