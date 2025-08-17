import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import GoogleMap from './GoogleMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Building2, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VenueMapProps {
  onClose?: () => void;
}

const VenueMap: React.FC<VenueMapProps> = ({ onClose }) => {
  const { venues } = useAppContext();
  
  // Replace this with your actual Google Maps API key
  const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
  
  if (!venues || venues.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Venue Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No venues found</p>
            <p className="text-sm text-gray-500 mt-2">
              Add venues to see them on the map
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY' && (
        <Alert className="border-amber-200 bg-amber-50">
          <Key className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Google Maps API Key Required:</strong> To display the interactive map, please:
            <br />1. Get an API key from Google Cloud Console
            <br />2. Replace 'YOUR_GOOGLE_MAPS_API_KEY' in VenueMap.tsx
            <br />3. Enable the Maps JavaScript API in your project
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-red-600" />
            Interactive Venue Map
          </CardTitle>
          <p className="text-sm text-gray-600">
            Click on the red markers to view venue details • {venues.length} venue{venues.length !== 1 ? 's' : ''} displayed
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <GoogleMap 
            venues={venues} 
            apiKey={GOOGLE_MAPS_API_KEY}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueMap;