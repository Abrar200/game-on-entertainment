// Google Maps configuration and utilities
// Loads the Maps JS API directly via script tag — avoids @googlemaps/js-api-loader hanging issues

export const GOOGLE_MAPS_API_KEY = 'AIzaSyA1Fn93oOxNsLhhc3DjYhcaPik8AlC2rEA';

export const GOOGLE_MAPS_CONFIG = {
  defaultCenter: { lat: -34.9285, lng: 138.6007 }, // Adelaide, SA
  defaultZoom: 9,
  mapStyles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }
  ]
};

let loadPromise: Promise<void> | null = null;

export const getGoogleMapsApiKey = (): string => GOOGLE_MAPS_API_KEY;

/**
 * Load Google Maps JS API via direct script injection.
 * Safe to call multiple times — returns the same promise after first call.
 * Includes places + geometry libraries needed by all components.
 */
export const loadGoogleMaps = (): Promise<void> => {
  // Already loaded
  if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
    return Promise.resolve();
  }

  // Already loading
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // Check again inside the promise in case of race
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
      resolve();
      return;
    }

    const callbackName = '__googleMapsReady__';

    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      reject(new Error(
        'Google Maps took too long to load. ' +
        'Check that the Maps JavaScript API and Geocoding API are both enabled ' +
        'for key AIzaSyA1Fn93oOxNsLhhc3DjYhcaPik8AlC2rEA in Google Cloud Console, ' +
        'and that the key has no HTTP referrer restrictions blocking Vercel.'
      ));
    }, 15000);

    (window as any)[callbackName] = () => {
      clearTimeout(timeout);
      delete (window as any)[callbackName];
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      clearTimeout(timeout);
      loadPromise = null; // Allow retry
      reject(new Error(
        'Failed to load Google Maps script. ' +
        'The API key may be invalid or blocked. Key: AIzaSyA1Fn93oOxNsLhhc3DjYhcaPik8AlC2rEA'
      ));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

export const isGoogleMapsLoaded = (): boolean =>
  typeof google !== 'undefined' && typeof google.maps !== 'undefined';