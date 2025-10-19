import React, { useState, useEffect } from 'react';
import './DemoMode.css';

const DemoMode = ({ onAddDemoUser, onRemoveDemoUser, demoUsers, currentUserLocation, onTriggerLaggingAlert }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [demoPositions, setDemoPositions] = useState({});
  const [alertTriggered, setAlertTriggered] = useState(false);

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
    { name: 'Yash Shriv', email: 'yash@demo.com', offset: { lat: 0.01, lng: 0.01 }, speed: 0.001 },
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

  useEffect(() => {
    if (isEnabled) {
      const baseLocation = getBaseLocation();
      
      // Initialize demo user positions around current user
      const initialPositions = {};
      demoUserTemplates.forEach((template, index) => {
        const userId = `demo_${index}`;
        initialPositions[userId] = {
          lat: baseLocation.lat + template.offset.lat,
          lng: baseLocation.lng + template.offset.lng,
          direction: Math.random() * 2 * Math.PI // Random initial direction
        };
      });
      setDemoPositions(initialPositions);

      // Add demo users
      demoUserTemplates.forEach((template, index) => {
        setTimeout(() => {
          const userId = `demo_${index}`;
          const position = initialPositions[userId];
          const demoUser = {
            ...template,
            id: userId,
            lat: position.lat,
            lng: position.lng,
            timestamp: Date.now(),
            battery: template.lagging ? 25 : Math.floor(Math.random() * 100),
            accuracy: Math.floor(Math.random() * 50) + 10
          };
          onAddDemoUser(demoUser);
        }, index * 500);
      });

      // Trigger lagging alert after 10 seconds
      const alertTimeout = setTimeout(() => {
        if (!alertTriggered && onTriggerLaggingAlert) {
          const laggingUser = demoUserTemplates.find(u => u.lagging);
          if (laggingUser) {
            const userId = `demo_${demoUserTemplates.indexOf(laggingUser)}`;
            const currentPos = demoPositions[userId];
            if (currentPos) {
              const baseLocation = getBaseLocation();
              const distance = calculateDistance(baseLocation.lat, baseLocation.lng, currentPos.lat, currentPos.lng);
              onTriggerLaggingAlert({
                type: 'lagging',
                userId: userId,
                name: laggingUser.name,
                distance: Math.round(distance),
                maxDistance: 500,
                location: { lat: currentPos.lat, lng: currentPos.lng },
                timestamp: Date.now(),
                message: `${laggingUser.name} is ${Math.round(distance)}m away from the group (limit: 500m)`,
                acknowledged: {}
              });
              setAlertTriggered(true);
            }
          }
        }
      }, 10000);

      // Simulate movement every 5 seconds
      const interval = setInterval(() => {
        const baseLocation = getBaseLocation();
        
        setDemoPositions(prev => {
          const updated = { ...prev };
          
          demoUserTemplates.forEach((template, index) => {
            const userId = `demo_${index}`;
            const currentPos = updated[userId];
            
            if (currentPos) {
              // Normal users move around the current user
              if (!template.lagging) {
                // Circular movement around user
                currentPos.direction += 0.1;
                const radius = 0.008; // Larger radius for better visibility
                updated[userId] = {
                  ...currentPos,
                  lat: baseLocation.lat + Math.cos(currentPos.direction) * radius,
                  lng: baseLocation.lng + Math.sin(currentPos.direction) * radius
                };
              } else {
                // Lagging user moves slowly away
                const awayDirection = Math.atan2(
                  currentPos.lat - baseLocation.lat,
                  currentPos.lng - baseLocation.lng
                );
                updated[userId] = {
                  ...currentPos,
                  lat: currentPos.lat + Math.cos(awayDirection) * template.speed,
                  lng: currentPos.lng + Math.sin(awayDirection) * template.speed
                };
              }
              
              // Update user in the system
              const updatedUser = {
                ...template,
                id: userId,
                lat: updated[userId].lat,
                lng: updated[userId].lng,
                timestamp: Date.now(),
                battery: template.lagging ? Math.max(5, Math.floor(Math.random() * 30)) : Math.max(20, Math.floor(Math.random() * 100)),
                accuracy: Math.floor(Math.random() * 50) + 10
              };
              onAddDemoUser(updatedUser);
            }
          });
          
          return updated;
        });
      }, 5000);

      return () => {
        clearInterval(interval);
        clearTimeout(alertTimeout);
      };
    } else {
      // Remove all demo users
      demoUserTemplates.forEach((_, index) => {
        onRemoveDemoUser(`demo_${index}`);
      });
      setDemoPositions({});
      setAlertTriggered(false);
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
          <p>Demo users moving around you. Apurva is lagging behind!</p>
          <div className="demo-stats">
            <span>Active Demo Users: {Object.keys(demoUsers || {}).length}</span>
            <span>• 1 Lagging Member</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoMode;