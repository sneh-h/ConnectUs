import React, { useState, useEffect } from 'react';
import './DemoMode.css';

const DemoMode = ({ onAddDemoUser, onRemoveDemoUser, demoUsers, currentUserLocation, onTriggerLaggingAlert }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [demoPositions, setDemoPositions] = useState({});
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [demoBatteries, setDemoBatteries] = useState({});
  const [demoPhase, setDemoPhase] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

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

  const demoUserTemplates = [
    { name: 'Saurav Thakur', email: 'saurav@demo.com', offset: { lat: 0.01, lng: 0.01 }, speed: 0.001 },
    { name: 'Deepika Chaudhary', email: 'deepika@demo.com', offset: { lat: -0.01, lng: 0.01 }, speed: 0.001 },
    { name: 'Jiya Gupta', email: 'jiya@demo.com', offset: { lat: 0.01, lng: -0.01 }, speed: 0.001 },
    { name: 'Apurva Mohite', email: 'apurva@demo.com', offset: { lat: -0.02, lng: -0.02 }, speed: 0.001, lagging: true }
  ];

  const getBaseLocation = () => {
    if (currentUserLocation?.lat && currentUserLocation?.lng) {
      return { lat: currentUserLocation.lat, lng: currentUserLocation.lng };
    }
    return { lat: 19.0760, lng: 72.8777 }; // Default Mumbai location
  };

  const showDemoNotification = (title, body) => {
    console.log(`DEMO NOTIFICATION: ${title} - ${body}`);
    
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          tag: `demo-${Date.now()}`,
          requireInteraction: false
        });
        
        setTimeout(() => {
          try {
            notification.close();
          } catch (e) {}
        }, 4000);
        
        return notification;
      } catch (error) {
        console.error('Notification error:', error);
      }
    } else {
      console.log('Notifications not granted. Permission:', Notification.permission);
    }
  };

  useEffect(() => {
    if (isEnabled) {
      console.log('Demo mode starting...');
      setDemoPhase(0);
      
      // Request notification permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      const baseLocation = getBaseLocation();
      
      // Initialize and add all demo users immediately
      const initialPositions = {};
      demoUserTemplates.forEach((template, index) => {
        const userId = `demo_${index}`;
        initialPositions[userId] = {
          lat: baseLocation.lat + template.offset.lat,
          lng: baseLocation.lng + template.offset.lng,
          direction: Math.random() * 2 * Math.PI
        };
        
        const demoUser = {
          ...template,
          id: userId,
          lat: initialPositions[userId].lat,
          lng: initialPositions[userId].lng,
          timestamp: Date.now(),
          battery: template.lagging ? 18 : 85,
          accuracy: Math.floor(Math.random() * 50) + 10
        };
        onAddDemoUser(demoUser);
      });
      setDemoPositions(initialPositions);

      const timeouts = [];
      
      // 4s: First lagging alert
      timeouts.push(setTimeout(() => {
        setDemoPhase(1);
        const laggingUser = demoUserTemplates.find(u => u.lagging);
        const userId = `demo_${demoUserTemplates.indexOf(laggingUser)}`;
        const distance = 650;
        
        if (onTriggerLaggingAlert) {
          onTriggerLaggingAlert({
            type: 'lagging',
            userId: userId,
            name: laggingUser.name,
            distance: distance,
            maxDistance: 500,
            location: { lat: baseLocation.lat - 0.025, lng: baseLocation.lng - 0.025 },
            timestamp: Date.now(),
            message: `📍 ${laggingUser.name} is ${distance}m away from the group (limit: 500m)`,
            acknowledged: {}
          });
        }
        
        showDemoNotification('📍 Member Lagging Behind', `${laggingUser.name} is ${distance}m away from the group!`);
      }, 4000));

      // 8s: Second lagging alert (4 seconds after first)
      timeouts.push(setTimeout(() => {
        setDemoPhase(2);
        const laggingUser = demoUserTemplates.find(u => u.lagging);
        const userId = `demo_${demoUserTemplates.indexOf(laggingUser)}`;
        const distance = 920;
        
        if (onTriggerLaggingAlert) {
          onTriggerLaggingAlert({
            type: 'lagging',
            userId: userId,
            name: laggingUser.name,
            distance: distance,
            maxDistance: 500,
            location: { lat: baseLocation.lat - 0.04, lng: baseLocation.lng - 0.04 },
            timestamp: Date.now(),
            message: `⚠️ ${laggingUser.name} is still ${distance}m away from the group!`,
            acknowledged: {}
          });
        }
        
        showDemoNotification('⚠️ Still Lagging Behind', `${laggingUser.name} is now ${distance}m away!`);
      }, 8000));

      // 12s: Chat message from Saurav
      timeouts.push(setTimeout(() => {
        setDemoPhase(3);
        // Send actual chat message (this will trigger chat notification)
        if (window.sendDemoChatMessage) {
          window.sendDemoChatMessage({
            userId: 'demo_0',
            name: 'Saurav Thakur',
            message: 'Hey everyone, where are you?',
            timestamp: Date.now()
          });
        }
        showDemoNotification('💬 New Message', 'Saurav Thakur: Hey everyone, where are you?');
      }, 12000));

      // 16s: Emergency alert from Jiya
      timeouts.push(setTimeout(() => {
        setDemoPhase(4);
        if (onTriggerLaggingAlert) {
          onTriggerLaggingAlert({
            type: 'emergency',
            userId: 'demo_2',
            name: 'Jiya Gupta',
            location: { lat: baseLocation.lat + 0.015, lng: baseLocation.lng + 0.015 },
            timestamp: Date.now(),
            message: '🚨 Jiya Gupta needs immediate help!',
            acknowledged: {}
          });
        }
        
        showDemoNotification('🚨 EMERGENCY ALERT!', 'Jiya Gupta needs immediate help!');
      }, 16000));

      // Movement simulation every 2 seconds
      const interval = setInterval(() => {
        const baseLocation = getBaseLocation();
        
        setDemoPositions(prev => {
          const updated = { ...prev };
          
          demoUserTemplates.forEach((template, index) => {
            const userId = `demo_${index}`;
            const currentPos = updated[userId];
            
            if (currentPos) {
              if (!template.lagging) {
                // Normal users move around user
                currentPos.direction += 0.2;
                const radius = 0.01;
                updated[userId] = {
                  ...currentPos,
                  lat: baseLocation.lat + Math.cos(currentPos.direction) * radius,
                  lng: baseLocation.lng + Math.sin(currentPos.direction) * radius
                };
              } else {
                // Apurva moves away (lagging)
                const awayDirection = Math.atan2(
                  currentPos.lat - baseLocation.lat,
                  currentPos.lng - baseLocation.lng
                );
                updated[userId] = {
                  ...currentPos,
                  lat: currentPos.lat + Math.cos(awayDirection) * 0.003,
                  lng: currentPos.lng + Math.sin(awayDirection) * 0.003
                };
              }
              
              const updatedUser = {
                ...template,
                id: userId,
                lat: updated[userId].lat,
                lng: updated[userId].lng,
                timestamp: Date.now(),
                battery: template.lagging ? 18 : 85,
                accuracy: Math.floor(Math.random() * 30) + 5,
                emergency: demoPhase >= 4 && userId === 'demo_2' // Emergency for Jiya
              };
              onAddDemoUser(updatedUser);
            }
          });
          
          return updated;
        });
      }, 2000);

      return () => {
        clearInterval(interval);
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    } else {
      // Remove all demo users
      demoUserTemplates.forEach((_, index) => {
        onRemoveDemoUser(`demo_${index}`);
      });
      setDemoPositions({});
      setAlertTriggered(false);
      setDemoBatteries({});
      setDemoPhase(0);
    }
  }, [isEnabled, currentUserLocation]);

  return (
    <div className="demo-mode">
      <div className="demo-header">
        <h4>🧪 Demo Mode</h4>
        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
      
      {isEnabled && (
        <div className="demo-info">
          <div className="demo-timeline">
            <div className="timeline-item">
              <span className={`phase ${demoPhase >= 1 ? 'completed' : ''}`}>📍 Lag 1</span>
            </div>
            <div className="timeline-item">
              <span className={`phase ${demoPhase >= 2 ? 'completed' : ''}`}>📍 Lag 2</span>
            </div>
            <div className="timeline-item">
              <span className={`phase ${demoPhase >= 3 ? 'completed' : ''}`}>💬 Chat</span>
            </div>
            <div className="timeline-item">
              <span className={`phase ${demoPhase >= 4 ? 'completed' : ''}`}>🚨 Emergency</span>
            </div>
          </div>
          <div className="demo-stats">
            <span>Demo Users: {Object.keys(demoUsers || {}).length}</span>
            <span>• Phase: {demoPhase}/7</span>
            <span>• Notifications: {notificationPermission}</span>
          </div>
          <p className="demo-description">
            {demoPhase === 0 && "🚀 Demo users moving around you..."}
            {demoPhase === 1 && "📍 Apurva is lagging behind!"}
            {demoPhase === 2 && "📍 Apurva still lagging!"}
            {demoPhase === 3 && "💬 Saurav sent a message!"}
            {demoPhase === 4 && "🚨 Jiya needs help!"}
          </p>
        </div>
      )}
    </div>
  );
};

export default DemoMode;