import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import GoogleMap from './GoogleMap';

interface RunMapProps {
  runs: any[];
  venues: any[];
  machines: any[];
}

const RunMap: React.FC<RunMapProps> = ({ runs, venues, machines }) => {
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [runVenues, setRunVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const GOOGLE_MAPS_API_KEY = 'AIzaSyA1Fn93oOxNsLhhc3DjYhcaPik8AlC2rEA';

  useEffect(() => {
    if (selectedRunId) {
      fetchRunVenues();
    } else {
      setRunVenues([]);
    }
  }, [selectedRunId]);

  const fetchRunVenues = async () => {
    if (!selectedRunId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('run_venues')
        .select('*, venues(*)')
        .eq('run_id', selectedRunId)
        .order('sequence_order', { ascending: true });

      if (error) throw error;
      setRunVenues(data || []);
    } catch (error) {
      console.error('Error fetching run venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedRun = runs.find(r => r.id === selectedRunId);
  
  // Get venues for the selected run
  const mappedVenues = runVenues.map(rv => rv.venues).filter(Boolean);

  // Calculate total machines in this run
  const totalMachines = mappedVenues.reduce((sum, venue) => {
    return sum + machines.filter(m => m.venue_id === venue.id).length;
  }, 0);

  const totalTime = runVenues.reduce((sum, rv) => 
    sum + (rv.estimated_time_minutes || 0), 0
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            Run Route Map
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select a run to view its route on the map
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedRunId} onValueChange={setSelectedRunId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a run to view on map" />
            </SelectTrigger>
            <SelectContent>
              {runs.filter(r => r.is_active).map(run => (
                <SelectItem key={run.id} value={run.id}>
                  {run.name} ({run.venue_count || 0} venues)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedRun && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-blue-600">{mappedVenues.length}</div>
                <div className="text-xs text-blue-700">Venues</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-green-600">{totalMachines}</div>
                <div className="text-xs text-green-700">Machines</div>
              </div>
              <div className="bg-orange-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.floor(totalTime / 60)}h {totalTime % 60}m
                </div>
                <div className="text-xs text-orange-700">Est. Time</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRunId && mappedVenues.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Route Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {runVenues.map((rv, index) => {
                  const venue = rv.venues;
                  const venueMachines = machines.filter(m => m.venue_id === venue?.id);
                  
                  return (
                    <div key={rv.id} className="flex items-center gap-3 p-2 border rounded">
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full font-bold text-xs">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{venue?.name}</div>
                        {venue?.address && (
                          <div className="text-xs text-gray-500">{venue.address}</div>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {venueMachines.length} machine{venueMachines.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading map...</p>
                </div>
              ) : (
                <GoogleMap 
                  venues={mappedVenues} 
                  apiKey={GOOGLE_MAPS_API_KEY}
                  showRoute={true}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedRunId && (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Select a run to view its route on the map</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RunMap;