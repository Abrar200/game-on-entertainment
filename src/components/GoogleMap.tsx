import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { supabase } from '@/lib/supabase';

interface Venue {
  id: string;
  name: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface GoogleMapProps {
  venues: Venue[];
  apiKey: string;
  showRoute?: boolean;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ venues, apiKey, showRoute = false }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geocodingProgress, setGeocodingProgress] = useState<string | null>(null);
  const [placedCount, setPlacedCount] = useState(0);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setError('Google Maps API key not configured');
      setLoading(false);
      return;
    }
    initializeMap();
    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      infoWindowRef.current?.close();
      routeLineRef.current?.setMap(null);
    };
  }, [apiKey]);

  useEffect(() => {
    if (map && venues.length > 0) {
      placeMarkers();
    }
  }, [map, venues, showRoute]);

  const initializeMap = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load Google Maps (resolves when window.google.maps is ready)
      await loadGoogleMaps();

      if (!mapRef.current) return;

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: -34.9285, lng: 138.6007 }, // Adelaide
        zoom: 9,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ]
      });

      setMap(mapInstance);
      infoWindowRef.current = new google.maps.InfoWindow();
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading Google Maps:', err);
      setError(err.message || 'Failed to load Google Maps.');
      setLoading(false);
    }
  };

  // Geocode an address with a timeout so one bad address doesn't hang everything
  const geocodeAddress = (address: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        console.warn(`Geocode timeout for: ${address}`);
        resolve(null);
      }, 5000);

      try {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { address: address.includes('Australia') ? address : `${address}, Australia` },
          (results, status) => {
            clearTimeout(timer);
            if (status === 'OK' && results && results[0]) {
              const loc = results[0].geometry.location;
              resolve({ lat: loc.lat(), lng: loc.lng() });
            } else {
              console.warn(`Geocode failed for "${address}": ${status}`);
              resolve(null);
            }
          }
        );
      } catch (err) {
        clearTimeout(timer);
        resolve(null);
      }
    });
  };

  // Save resolved coordinates back to Supabase so we don't geocode again next time
  const saveCoordinates = async (venueId: string, lat: number, lng: number) => {
    try {
      await supabase
        .from('venues')
        .update({ latitude: lat, longitude: lng })
        .eq('id', venueId);
      console.log(`Saved coordinates for venue ${venueId}`);
    } catch (err) {
      console.warn('Could not save venue coordinates:', err);
    }
  };

  const placeMarkers = async () => {
    if (!map) return;

    // Clear existing markers and route
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    routeLineRef.current?.setMap(null);

    const bounds = new google.maps.LatLngBounds();
    const routeCoordinates: google.maps.LatLng[] = [];
    let placed = 0;

    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i];

      // Update progress for venues without coordinates
      if (!venue.latitude || !venue.longitude) {
        setGeocodingProgress(`Locating ${i + 1} of ${venues.length}: ${venue.name}…`);
      }

      let position: { lat: number; lng: number } | null = null;

      // 1. Use stored coordinates if available
      if (venue.latitude && venue.longitude) {
        position = { lat: venue.latitude, lng: venue.longitude };
      }
      // 2. Fall back to geocoding the address
      else if (venue.address) {
        position = await geocodeAddress(venue.address);
        // If geocoded successfully, save back to DB so next load is instant
        if (position) {
          saveCoordinates(venue.id, position.lat, position.lng);
        }
      }

      if (!position) {
        console.warn(`Could not place marker for: ${venue.name} — no coordinates or address`);
        continue;
      }

      const latLng = new google.maps.LatLng(position.lat, position.lng);
      routeCoordinates.push(latLng);
      bounds.extend(latLng);
      placed++;

      const marker = new google.maps.Marker({
        position,
        map,
        title: venue.name,
        label: {
          text: (i + 1).toString(),
          color: 'white',
          fontSize: '13px',
          fontWeight: 'bold'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: '#dc2626',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      });

      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="padding:8px;min-width:160px">
              <strong style="font-size:14px">${venue.name}</strong>
              ${venue.address ? `<p style="margin:4px 0 0;font-size:13px;color:#555">${venue.address}</p>` : ''}
              <p style="margin:4px 0 0;font-size:11px;color:#888">Venue ${i + 1} of ${venues.length}</p>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersRef.current.push(marker);
      setPlacedCount(placed);
    }

    setGeocodingProgress(null);

    // Draw route line
    if (showRoute && routeCoordinates.length > 1) {
      routeLineRef.current = new google.maps.Polyline({
        path: routeCoordinates,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map
      });
    }

    // Fit map to all markers
    if (routeCoordinates.length > 0) {
      map.fitBounds(bounds);
      if (routeCoordinates.length === 1) map.setZoom(13);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Loading map…</p>
          <p className="text-sm text-gray-400 mt-1">Initialising Google Maps</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-red-50 rounded border border-red-200">
        <div className="text-center p-8 max-w-md">
          <p className="text-red-600 font-semibold text-lg mb-2">Map failed to load</p>
          <p className="text-red-500 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-3">
            Make sure the Maps JavaScript API and Geocoding API are both enabled for your key in Google Cloud Console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Geocoding progress overlay */}
      {geocodingProgress && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-sm shadow-md rounded-full px-4 py-2 text-sm text-gray-700 flex items-center gap-2">
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600" />
          {geocodingProgress}
        </div>
      )}

      <div ref={mapRef} className="w-full h-[600px] rounded" />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold mb-2">Map Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white" />
            <span>Venue</span>
          </div>
          {showRoute && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-600" />
              <span>Route</span>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          {placedCount} of {venues.length} venue{venues.length !== 1 ? 's' : ''} placed
        </div>
      </div>
    </div>
  );
};

export default GoogleMap;