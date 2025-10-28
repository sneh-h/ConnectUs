import React, { useState, useEffect } from 'react';
import './utils/DemoMode.css';

const DemoMode = ({ onAddDemoUser, onRemoveDemoUser, onTriggerLaggingAlert, currentUserLocation }) => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (!isEnabled) {
      onRemoveDemoUser('demo_0');
      onRemoveDemoUser('demo_1'); 
      onRemoveDemoUser('demo_2');
      onRemoveDemoUser('demo_3');
      return;
    }

    const base = currentUserLocation || { lat: 19.0760, lng: 72.8777 };
    
    // Add 4 demo users immediately
    onAddDemoUser({ id: 'demo_0', name: 'Yash', email: 'yash@demo.com', role: 'member', lat: base.lat + 0.002, lng: base.lng + 0.002, battery: 80, timestamp: Date.now(), accuracy: 15 });
    onAddDemoUser({ id: 'demo_1', name: 'Deepika', email: 'deepika@demo.com', role: 'member', lat: base.lat - 0.002, lng: base.lng + 0.002, battery: 75, timestamp: Date.now(), accuracy: 15 });
    onAddDemoUser({ id: 'demo_2', name: 'Jiya', email: 'jiya@demo.com', role: 'member', lat: base.lat + 0.002, lng: base.lng - 0.002, battery: 90, timestamp: Date.now(), accuracy: 15 });
    onAddDemoUser({ id: 'demo_3', name: 'Apurva', email: 'apurva@demo.com', role: 'member', lat: base.lat - 0.003, lng: base.lng - 0.003, battery: 25, timestamp: Date.now(), accuracy: 15 });

    // Force notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }

    // First notification at 4 seconds - 650m
    setTimeout(() => {
      console.log('Triggering first demo alert');
      // Force show notification
      try {
        new Notification('📍 Member Lagging Behind', {
          body: 'Apurva is 650m away from the group (limit: 500m)',
          requireInteraction: true
        });
      } catch (e) {
        console.log('Notification failed:', e);
        alert('🚨 DEMO ALERT: Apurva is 650m away!');
      }
      
      onTriggerLaggingAlert({
        type: 'lagging',
        userId: 'demo_3',
        name: 'Apurva',
        distance: 650,
        maxDistance: 500,
        timestamp: Date.now(),
        message: 'Apurva is 650m away from the group (limit: 500m)',
        acknowledged: {}
      });
    }, 4000);

    // Second notification at 8 seconds
    setTimeout(() => {
      console.log('Triggering second demo alert');
      try {
        new Notification('📍 Member Lagging Behind', {
          body: 'Apurva is now 850m away from the group (limit: 500m)',
          requireInteraction: true
        });
      } catch (e) {
        console.log('Notification failed:', e);
        alert('🚨 DEMO ALERT: Apurva is now 850m away!');
      }
      
      onTriggerLaggingAlert({
        type: 'lagging',
        userId: 'demo_3',
        name: 'Apurva',
        distance: 850,
        maxDistance: 500,
        timestamp: Date.now(),
        message: 'Apurva is now 850m away from the group (limit: 500m)',
        acknowledged: {}
      });
    }, 8000);

    // Move users every 2 seconds
    let moveCount = 0;
    const interval = setInterval(() => {
      moveCount++;
      
      // Move users around me
      onAddDemoUser({ id: 'demo_0', name: 'Yash', email: 'yash@demo.com', role: 'member', lat: base.lat + 0.002 + Math.sin(moveCount * 0.3) * 0.001, lng: base.lng + 0.002 + Math.cos(moveCount * 0.3) * 0.001, battery: 80, timestamp: Date.now(), accuracy: 15 });
      onAddDemoUser({ id: 'demo_1', name: 'Deepika', email: 'deepika@demo.com', role: 'member', lat: base.lat - 0.002 + Math.sin(moveCount * 0.4) * 0.001, lng: base.lng + 0.002 + Math.cos(moveCount * 0.4) * 0.001, battery: 75, timestamp: Date.now(), accuracy: 15 });
      onAddDemoUser({ id: 'demo_2', name: 'Jiya', email: 'jiya@demo.com', role: 'member', lat: base.lat + 0.002 + Math.sin(moveCount * 0.5) * 0.001, lng: base.lng - 0.002 + Math.cos(moveCount * 0.5) * 0.001, battery: 90, timestamp: Date.now(), accuracy: 15 });
      
      // Apurva moves away
      const apurvaLat = base.lat - 0.003 - (moveCount * 0.0008);
      const apurvaLng = base.lng - 0.003 - (moveCount * 0.0008);
      onAddDemoUser({ id: 'demo_3', name: 'Apurva', email: 'apurva@demo.com', role: 'member', lat: apurvaLat, lng: apurvaLng, battery: 25, timestamp: Date.now(), accuracy: 15 });
    }, 2000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  return (
    <div className="demo-mode">
      <div className="demo-header">
        <h4>🧪 Demo Mode</h4>
        <label className="demo-toggle">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          <span className="toggle-slider"></span>
        </label>
      </div>
      {isEnabled && <div className="demo-info"><p>Demo users moving. Alerts at 4s and 8s.</p></div>}
    </div>
  );
};

export default DemoMode;