import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, X, AlertCircle } from 'lucide-react';
import { GOOGLE_MAPS_CONFIG, generateMockCoordinates, createVenueMarkerIcon } from '@/lib/googleMaps';

interface Venue {
  id: string;
  name: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

interface GoogleMapProps {
  venues: Venue[];
  apiKey?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ venues, apiKey }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setError('Please set your Google Maps API key in VenueMap.tsx');
      setIsLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      if (mapRef.current) {
        const googleMap = new google.maps.Map(mapRef.current, {
          center: GOOGLE_MAPS_CONFIG.defaultCenter,
          zoom: GOOGLE_MAPS_CONFIG.defaultZoom,
          styles: GOOGLE_MAPS_CONFIG.mapStyles
        });
        
        setMap(googleMap);
        setIsLoading(false);
      }
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
      setError('Failed to load Google Maps. Check your API key.');
      setIsLoading(false);
    });
  }, [apiKey]);

  useEffect(() => {
    if (!map || venues.length === 0) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    
    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    venues.forEach((venue, index) => {
      let lat = venue.latitude;
      let lng = venue.longitude;
      
      // Generate mock coordinates if not provided
      if (!lat || !lng) {
        const mockCoords = generateMockCoordinates(index, venues.length);
        lat = mockCoords.lat;
        lng = mockCoords.lng;
      }
      
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: venue.name,
        icon: createVenueMarkerIcon(index + 1)
      });

      marker.addListener('click', () => {
        setSelectedVenue(venue);
        map.panTo({ lat, lng });
      });

      newMarkers.push(marker);
      bounds.extend({ lat, lng });
    });

    setMarkers(newMarkers);
    
    if (venues.length > 1) {
      map.fitBounds(bounds);
    }
  }, [map, venues]);

  if (isLoading) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-red-600 max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <p className="font-semibold mb-2">Google Maps Error</p>
          <p className="text-sm mb-4">{error}</p>
          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
            <p className="font-medium mb-1">To fix this:</p>
            <p>1. Get a Google Maps API key from Google Cloud Console</p>
            <p>2. Replace 'YOUR_GOOGLE_MAPS_API_KEY' in VenueMap.tsx</p>
            <p>3. Enable Maps JavaScript API in your Google Cloud project</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      
      {selectedVenue && (
        <Card className="absolute bottom-4 left-4 max-w-sm z-10 shadow-lg border-2 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-red-700 mb-2">{selectedVenue.name}</h3>
                {selectedVenue.address && (
                  <p className="text-sm text-gray-700 mb-2 flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>{selectedVenue.address}</span>
                  </p>
                )}
                {selectedVenue.contact_person && (
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold text-red-600">Contact:</span> {selectedVenue.contact_person}
                  </p>
                )}
                {selectedVenue.phone && (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-red-600">Phone:</span> {selectedVenue.phone}
                  </p>
                )}
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setSelectedVenue(null)}
                className="ml-2 h-8 w-8 p-0 hover:bg-red-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 text-sm shadow-lg border border-red-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold">1</span>
          </div>
          <span className="font-semibold text-red-700">Venue Location</span>
        </div>
        <p className="text-xs text-gray-600">
          <span className="font-medium">{venues.length}</span> venue{venues.length !== 1 ? 's' : ''} displayed
        </p>
      </div>
    </div>
  );
};

export default GoogleMap;