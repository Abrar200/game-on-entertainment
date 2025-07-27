import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface LocationRecord {
  id: string;
  machine_id: string;
  venue_id: string;
  venue_name: string;
  moved_date: string;
  moved_from_venue_id: string;
  moved_from_venue_name: string;
  reason: string;
  moved_by: string;
}

interface LocationHistoryProps {
  machineId: string;
  machineName: string;
}

const LocationHistory: React.FC<LocationHistoryProps> = ({ machineId, machineName }) => {
  const [records, setRecords] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const { toast } = useToast();

  const [newRecord, setNewRecord] = useState({
    venue_id: '',
    moved_from_venue_id: '',
    reason: '',
    moved_by: ''
  });

  useEffect(() => {
    fetchRecords();
    fetchVenues();
  }, [machineId]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_location_history')
        .select('*')
        .eq('machine_id', machineId)
        .order('moved_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load location history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase.from('venues').select('*');
      if (error) throw error;
      setVenues(data || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const toVenue = venues.find(v => v.id === newRecord.venue_id);
      const fromVenue = venues.find(v => v.id === newRecord.moved_from_venue_id);

      const { error } = await supabase
        .from('machine_location_history')
        .insert({
          machine_id: machineId,
          venue_id: newRecord.venue_id,
          venue_name: toVenue?.name || '',
          moved_from_venue_id: newRecord.moved_from_venue_id,
          moved_from_venue_name: fromVenue?.name || '',
          reason: newRecord.reason,
          moved_by: newRecord.moved_by
        });

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Location record added successfully' });
      setShowAddDialog(false);
      setNewRecord({ venue_id: '', moved_from_venue_id: '', reason: '', moved_by: '' });
      fetchRecords();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add location record', variant: 'destructive' });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location History - {machineName}
        </CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Move</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Machine Move</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Moved From</Label>
                <Select value={newRecord.moved_from_venue_id} onValueChange={(value) => setNewRecord({...newRecord, moved_from_venue_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select previous venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Moved To</Label>
                <Select value={newRecord.venue_id} onValueChange={(value) => setNewRecord({...newRecord, venue_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={newRecord.reason} onChange={(e) => setNewRecord({...newRecord, reason: e.target.value})} placeholder="Why was the machine moved?" />
              </div>
              <div>
                <Label>Moved By</Label>
                <Input value={newRecord.moved_by} onChange={(e) => setNewRecord({...newRecord, moved_by: e.target.value})} placeholder="Who moved the machine?" />
              </div>
              <Button type="submit">Record Move</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Moved By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{new Date(record.moved_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{record.moved_from_venue_name || 'Unknown'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="default">{record.venue_name}</Badge>
                </TableCell>
                <TableCell>{record.reason}</TableCell>
                <TableCell>{record.moved_by}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LocationHistory;