// Google Maps configuration and utilities

export const GOOGLE_MAPS_CONFIG = {
  // Default center for UK
  defaultCenter: { lat: 54.5, lng: -4.0 },
  defaultZoom: 6,
  
  // Map styles to make venues stand out
  mapStyles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'road',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Generate mock coordinates for venues without lat/lng
export const generateMockCoordinates = (index: number, total: number) => {
  // Spread venues across UK
  const ukBounds = {
    north: 60.8,
    south: 49.9,
    east: 1.8,
    west: -8.6
  };
  
  const latRange = ukBounds.north - ukBounds.south;
  const lngRange = ukBounds.east - ukBounds.west;
  
  return {
    lat: ukBounds.south + (latRange * Math.random()),
    lng: ukBounds.west + (lngRange * Math.random())
  };
};

// Create custom marker icon SVG
export const createVenueMarkerIcon = (number: number) => {
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="#dc2626" stroke="#ffffff" stroke-width="3"/>
        <circle cx="20" cy="20" r="15" fill="#ef4444"/>
        <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">${number}</text>
      </svg>
    `),
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 20)
  };
};

// Get API key from environment or return placeholder
export const getGoogleMapsApiKey = (): string => {
  // In a real app, this would come from environment variables
  // For now, return a placeholder that users need to replace
  return process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
};