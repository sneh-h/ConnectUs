import React, { useEffect, useState } from 'react';
import { updateUserLocation, subscribeToGroupLocations } from '../firebase/location';
import { useAuth } from '../contexts/AuthContext';

const LocationTracker = ({ groupId }) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState({});
  const [myLocation, setMyLocation] = useState(null);

  useEffect(() => {
    if (!user || !groupId) return;

    // Subscribe to group locations
    const unsubscribe = subscribeToGroupLocations(groupId, (snapshot) => {
      if (snapshot.exists()) {
        setLocations(snapshot.val());
      }
    });

    return unsubscribe;
  }, [user, groupId]);

  useEffect(() => {
    if (!user) return;

    // Get user's location
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        setMyLocation(location);
        updateUserLocation(user.uid, location);
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);

  return (
    <div className="location-tracker">
      <h3>Group Locations</h3>
      
      {myLocation && (
        <div className="my-location">
          <h4>My Location:</h4>
          <p>Lat: {myLocation.lat.toFixed(6)}</p>
          <p>Lng: {myLocation.lng.toFixed(6)}</p>
        </div>
      )}

      <div className="group-locations">
        {Object.entries(locations).map(([userId, location]) => (
          <div key={userId} className="location-item">
            <h5>User: {userId}</h5>
            <p>Lat: {location.lat?.toFixed(6)}</p>
            <p>Lng: {location.lng?.toFixed(6)}</p>
            <p>Updated: {new Date(location.timestamp).toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationTracker;