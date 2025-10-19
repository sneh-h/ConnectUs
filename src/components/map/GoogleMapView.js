import React from 'react';

const GoogleMapView = ({ locations, currentLocation }) => {
  // Create Google Maps URL with markers
  const createMapUrl = () => {
    const baseUrl = 'https://www.google.com/maps/embed/v1/view';
    const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // You need to get this from Google Cloud Console
    
    const center = currentLocation 
      ? `${currentLocation.latitude},${currentLocation.longitude}`
      : locations.length > 0 
      ? `${locations[0].latitude},${locations[0].longitude}`
      : '28.6139,77.2090'; // Default to Delhi

    return `${baseUrl}?key=${apiKey}&center=${center}&zoom=13`;
  };

  // Alternative: Simple map link
  const createMapLink = () => {
    if (currentLocation) {
      return `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
    }
    return 'https://www.google.com/maps';
  };

  return (
    <div className="google-map-container">
      {/* Option 1: Embedded Map (requires API key) */}
      {/* <iframe
        width="100%"
        height="400"
        style={{ border: 0, borderRadius: '10px' }}
        src={createMapUrl()}
        allowFullScreen
      ></iframe> */}

      {/* Option 2: Simple link to Google Maps */}
      <div className="map-link-container">
        <a 
          href={createMapLink()} 
          target="_blank" 
          rel="noopener noreferrer"
          className="map-link"
        >
          📍 View on Google Maps
        </a>
        {currentLocation && (
          <p className="coordinates">
            Current: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </p>
        )}
      </div>
    </div>
  );
};

export default GoogleMapView;