import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Venue {
  id: string;
  name: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

interface InteractiveMapProps {
  venues: Venue[];
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ venues }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Generate mock coordinates for venues if not provided
  const venuesWithCoords = venues.map((venue, index) => ({
    ...venue,
    latitude: venue.latitude || (51.5074 + (Math.random() - 0.5) * 10),
    longitude: venue.longitude || (-0.1278 + (Math.random() - 0.5) * 10)
  }));

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));

  return (
    <div className="relative w-full h-[600px] bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden border">
      {/* Map Background */}
      <div 
        ref={mapRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center'
        }}
      >
        {/* Country Outline (Simplified UK) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600">
          <path
            d="M200 100 L600 120 L580 400 L220 380 Z M300 200 L500 210 L480 300 L320 290 Z"
            fill="#e5f3ff"
            stroke="#3b82f6"
            strokeWidth="2"
            opacity="0.3"
          />
        </svg>

        {/* Venue Pins */}
        {venuesWithCoords.map((venue, index) => {
          const x = 200 + (venue.longitude! + 10) * 30;
          const y = 150 + (60 - venue.latitude!) * 8;
          
          return (
            <div
              key={venue.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: x, top: y }}
              onClick={() => setSelectedVenue(venue)}
            >
              <div className="relative">
                <MapPin 
                  className="h-8 w-8 text-red-600 drop-shadow-lg hover:scale-110 transition-transform" 
                  fill="#dc2626"
                />
                <div className="absolute -top-2 -right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-red-600">
                  {index + 1}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button size="sm" variant="outline" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Venue Info Popup */}
      {selectedVenue && (
        <Card className="absolute bottom-4 left-4 max-w-sm z-10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{selectedVenue.name}</h3>
                {selectedVenue.address && (
                  <p className="text-sm text-gray-600 mt-1">{selectedVenue.address}</p>
                )}
                {selectedVenue.contact_person && (
                  <p className="text-sm text-gray-600 mt-1">Contact: {selectedVenue.contact_person}</p>
                )}
                {selectedVenue.phone && (
                  <p className="text-sm text-gray-600 mt-1">Phone: {selectedVenue.phone}</p>
                )}
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setSelectedVenue(null)}
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-red-600" fill="#dc2626" />
          <span>Venue Location</span>
        </div>
        <p className="text-xs text-gray-600">
          {venuesWithCoords.length} venues displayed
        </p>
      </div>
    </div>
  );
};

export default InteractiveMap;