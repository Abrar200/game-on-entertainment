import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';

interface Venue {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface GoogleMapProps {
  venues: Venue[];
  apiKey: string;
  showRoute?: boolean; // Show route lines between venues
}

const GoogleMap: React.FC<GoogleMapProps> = ({ venues, apiKey, showRoute = false }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      // Cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      if (routeLineRef.current) {
        routeLineRef.current.setMap(null);
      }
    };
  }, [apiKey]);

  useEffect(() => {
    if (map && venues.length > 0) {
      updateMarkers();
    }
  }, [map, venues, showRoute]);

  const initializeMap = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use centralized loader
      await loadGoogleMaps();

      if (!mapRef.current) return;

      // Center on South Australia (Adelaide)
      const southAustraliaCenter = { lat: -34.9285, lng: 138.6007 };

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: southAustraliaCenter,
        zoom: 6,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(mapInstance);
      infoWindowRef.current = new google.maps.InfoWindow();
      setLoading(false);

    } catch (err: any) {
      console.error('Error loading Google Maps:', err);
      setError(err.message || 'Failed to load Google Maps');
      setLoading(false);
    }
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ 
        address: address + ', South Australia, Australia' 
      });

      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        return { lat: location.lat(), lng: location.lng() };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const updateMarkers = async () => {
    if (!map) return;

    // Clear existing markers and route
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
    }

    const bounds = new google.maps.LatLngBounds();
    const routeCoordinates: google.maps.LatLng[] = [];

    // Create markers for each venue
    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i];
      let position: { lat: number; lng: number } | null = null;

      // Try to get coordinates
      if (venue.latitude && venue.longitude) {
        position = { lat: venue.latitude, lng: venue.longitude };
      } else if (venue.address) {
        position = await geocodeAddress(venue.address);
      }

      if (!position) {
        console.warn(`Could not get coordinates for venue: ${venue.name}`);
        continue;
      }

      const latLng = new google.maps.LatLng(position.lat, position.lng);
      routeCoordinates.push(latLng);

      // Create custom marker icon with number
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: venue.name,
        label: {
          text: (i + 1).toString(),
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: '#dc2626',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      });

      marker.addListener('click', () => {
        setSelectedVenue(venue);
        if (infoWindowRef.current) {
          const content = `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${venue.name}</h3>
              ${venue.address ? `<p style="margin: 0; font-size: 14px;">${venue.address}</p>` : ''}
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Stop ${i + 1} of ${venues.length}</p>
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersRef.current.push(marker);
      bounds.extend(latLng);
    }

    // Draw route line if enabled
    if (showRoute && routeCoordinates.length > 1) {
      routeLineRef.current = new google.maps.Polyline({
        path: routeCoordinates,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map
      });
    }

    // Fit map to show all markers
    if (routeCoordinates.length > 0) {
      map.fitBounds(bounds);
      
      // Adjust zoom if only one marker
      if (routeCoordinates.length === 1) {
        map.setZoom(12);
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-red-50 rounded border border-red-200">
        <div className="text-center p-8">
          <p className="text-red-600 font-semibold mb-2">Map Error</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div ref={mapRef} className="w-full h-[600px] rounded" />
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold mb-2">Map Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white"></div>
            <span>Venue Location</span>
          </div>
          {showRoute && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-600"></div>
              <span>Route Path</span>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-600">
          {venues.length} venue{venues.length !== 1 ? 's' : ''} displayed
        </div>
      </div>
    </div>
  );
};

export default GoogleMap;