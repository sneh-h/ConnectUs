import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapView = ({ locations, currentLocation }) => {
  // Default center (if no locations)
  const defaultCenter = [28.6139, 77.2090]; // Delhi
  
  // Use current location or first location as center
  const center = currentLocation 
    ? [currentLocation.latitude, currentLocation.longitude]
    : locations.length > 0 
    ? [locations[0].latitude, locations[0].longitude]
    : defaultCenter;

  return (
    <div className="map-container">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '400px', width: '100%', borderRadius: '10px' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Current location marker (red) */}
        {currentLocation && (
          <Marker 
            position={[currentLocation.latitude, currentLocation.longitude]}
            icon={new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })}
          >
            <Popup>
              <div>
                <strong>Your Current Location</strong><br/>
                Lat: {currentLocation.latitude.toFixed(6)}<br/>
                Lng: {currentLocation.longitude.toFixed(6)}<br/>
                Time: {new Date(currentLocation.timestamp).toLocaleString()}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Other locations (blue) */}
        {locations.map((location) => (
          <Marker 
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })}
          >
            <Popup>
              <div>
                <strong>{location.userEmail}</strong><br/>
                Lat: {location.latitude.toFixed(6)}<br/>
                Lng: {location.longitude.toFixed(6)}<br/>
                Time: {new Date(location.timestamp.seconds * 1000).toLocaleString()}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;