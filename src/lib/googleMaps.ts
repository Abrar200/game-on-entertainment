import { Loader } from '@googlemaps/js-api-loader';

// Google Maps configuration and utilities

export const GOOGLE_MAPS_CONFIG = {
  // Default center for South Australia
  defaultCenter: { lat: -34.9285, lng: 138.6007 }, // Adelaide, SA
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

// Singleton loader instance
let loaderInstance: Loader | null = null;
let loadPromise: Promise<typeof google> | null = null;

// Get API key
export const getGoogleMapsApiKey = (): string => {
  return 'AIzaSyA1Fn93oOxNsLhhc3DjYhcaPik8AlC2rEA';
};

// Create or get the singleton loader with ALL required libraries
export const getGoogleMapsLoader = (): Loader => {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: getGoogleMapsApiKey(),
      version: 'weekly',
      libraries: ['places', 'geometry'] // Include ALL libraries needed by any component
    });
  }
  return loaderInstance;
};

// Load Google Maps (returns cached promise if already loading/loaded)
export const loadGoogleMaps = async (): Promise<typeof google> => {
  if (!loadPromise) {
    const loader = getGoogleMapsLoader();
    loadPromise = loader.load();
  }
  return loadPromise;
};

// Check if Google Maps is already loaded
export const isGoogleMapsLoaded = (): boolean => {
  return typeof google !== 'undefined' && 
         typeof google.maps !== 'undefined';
};

// Generate mock coordinates for venues without lat/lng
export const generateMockCoordinates = (index: number, total: number) => {
  // Spread venues across South Australia
  const saBounds = {
    north: -32.0,
    south: -38.0,
    east: 141.0,
    west: 135.0
  };
  
  const latRange = saBounds.north - saBounds.south;
  const lngRange = saBounds.east - saBounds.west;
  
  return {
    lat: saBounds.south + (latRange * Math.random()),
    lng: saBounds.west + (lngRange * Math.random())
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