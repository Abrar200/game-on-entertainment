import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import ImageUpload from './ImageUpload';

interface Run {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  frequency: string;
  frequency_details?: any;
  assigned_to?: string;
  is_active: boolean;
}

interface RunVenue {
  id?: string;
  venue_id: string;
  sequence_order: number;
  notes?: string;
  estimated_time_minutes?: number;
}

interface RunEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  run: Run | null;
  onSave: () => void;
}

// Helper function to generate schedules based on frequency
const generateSchedules = async (runId: string, frequency: string, startDate: Date = new Date()) => {
  try {
    console.log('🗓️ Generating schedules for run:', runId, 'Frequency:', frequency);

    // First, delete existing schedules for this run
    const { error: deleteError } = await supabase
      .from('run_schedules')
      .delete()
      .eq('run_id', runId);

    if (deleteError) {
      console.error('Error deleting old schedules:', deleteError);
    }

    const schedules = [];
    const today = new Date(startDate);
    today.setHours(0, 0, 0, 0); // Reset to start of day

    // Determine how many schedules to generate and interval
    let numberOfSchedules = 0;
    let dayInterval = 0;

    switch (frequency) {
      case 'weekly':
        numberOfSchedules = 12; // 3 months worth of weekly schedules
        dayInterval = 7;
        break;
      case 'biweekly':
        numberOfSchedules = 6; // 3 months worth of biweekly schedules
        dayInterval = 14;
        break;
      case 'monthly':
        numberOfSchedules = 3; // 3 months worth of monthly schedules
        dayInterval = 30; // Approximate
        break;
      default:
        console.log('Custom or invalid frequency, skipping schedule generation');
        return;
    }

    // Generate schedule entries
    for (let i = 0; i < numberOfSchedules; i++) {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(today.getDate() + (i * dayInterval));

      schedules.push({
        run_id: runId,
        scheduled_date: scheduleDate.toISOString().split('T')[0],
        completed: false,
        run_number: i + 1,
        notes: null
      });
    }

    if (schedules.length > 0) {
      console.log(`📅 Creating ${schedules.length} schedule entries`);
      const { error } = await supabase
        .from('run_schedules')
        .insert(schedules);

      if (error) {
        console.error('❌ Error creating schedules:', error);
        throw error;
      }

      console.log('✅ Schedules created successfully');
    }
  } catch (error) {
    console.error('❌ Error in generateSchedules:', error);
    throw error;
  }
};

const RunEditDialog: React.FC<RunEditDialogProps> = ({ isOpen, onClose, run, onSave }) => {
  const { toast } = useToast();
  const { venues, machines } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [runVenues, setRunVenues] = useState<RunVenue[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    frequency: 'weekly',
    assigned_to: '',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (run) {
        setFormData({
          name: run.name || '',
          description: run.description || '',
          image_url: run.image_url || '',
          frequency: run.frequency || 'weekly',
          assigned_to: run.assigned_to || '',
          is_active: run.is_active ?? true
        });
        fetchRunVenues();
      } else {
        resetForm();
      }
    }
  }, [isOpen, run]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      frequency: 'weekly',
      assigned_to: '',
      is_active: true
    });
    setRunVenues([]);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, username, role')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRunVenues = async () => {
    if (!run?.id) return;

    try {
      const { data, error } = await supabase
        .from('run_venues')
        .select('*')
        .eq('run_id', run.id)
        .order('sequence_order', { ascending: true });

      if (error) throw error;
      setRunVenues(data || []);
    } catch (error) {
      console.error('Error fetching run venues:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Run name is required',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const runData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        image_url: formData.image_url || null,
        frequency: formData.frequency,
        assigned_to: formData.assigned_to || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      let runId = run?.id;

      if (run) {
        // Update existing run
        const { error } = await supabase
          .from('runs')
          .update(runData)
          .eq('id', run.id);

        if (error) throw error;

        console.log('✅ Run updated:', run.id);
      } else {
        // Create new run
        const { data, error } = await supabase
          .from('runs')
          .insert([runData])
          .select()
          .single();

        if (error) throw error;
        runId = data.id;

        console.log('✅ Run created:', runId);
      }

      // Save venues
      if (runId) {
        // Delete existing venues
        await supabase
          .from('run_venues')
          .delete()
          .eq('run_id', runId);

        // Insert new venues
        if (runVenues.length > 0) {
          const venuesToInsert = runVenues.map((rv, index) => ({
            run_id: runId,
            venue_id: rv.venue_id,
            sequence_order: index,
            notes: rv.notes || null,
            estimated_time_minutes: rv.estimated_time_minutes || null
          }));

          const { error: venuesError } = await supabase
            .from('run_venues')
            .insert(venuesToInsert);

          if (venuesError) throw venuesError;

          console.log('✅ Run venues saved:', venuesToInsert.length);
        }

        // Generate schedules based on frequency
        try {
          await generateSchedules(runId, formData.frequency);
          console.log('✅ Schedules generated for run');
        } catch (scheduleError) {
          console.error('⚠️ Error generating schedules:', scheduleError);
          // Don't fail the entire operation if schedule generation fails
          toast({
            title: 'Warning',
            description: 'Run saved but schedules could not be generated',
            variant: 'destructive'
          });
        }
      }

      toast({
        title: 'Success',
        description: `Run ${run ? 'updated' : 'created'} successfully${!run ? ' with schedules' : ''}`
      });

      onSave();
    } catch (error: any) {
      console.error('Error saving run:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save run',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addVenue = (venueId: string) => {
    if (runVenues.some(rv => rv.venue_id === venueId)) {
      toast({
        title: 'Already Added',
        description: 'This venue is already in the run',
        variant: 'destructive'
      });
      return;
    }

    setRunVenues([...runVenues, {
      venue_id: venueId,
      sequence_order: runVenues.length,
      notes: '',
      estimated_time_minutes: 30
    }]);
  };

  const removeVenue = (index: number) => {
    setRunVenues(runVenues.filter((_, i) => i !== index));
  };

  const updateVenueNotes = (index: number, notes: string) => {
    const updated = [...runVenues];
    updated[index].notes = notes;
    setRunVenues(updated);
  };

  const updateVenueTime = (index: number, minutes: number) => {
    const updated = [...runVenues];
    updated[index].estimated_time_minutes = minutes;
    setRunVenues(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newVenues = [...runVenues];
    const draggedItem = newVenues[draggedIndex];
    newVenues.splice(draggedIndex, 1);
    newVenues.splice(index, 0, draggedItem);

    setRunVenues(newVenues);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getMachinesForVenue = (venueId: string) => {
    return machines.filter(m => m.venue_id === venueId);
  };

  const getVenueName = (venueId: string) => {
    return venues.find(v => v.id === venueId)?.name || 'Unknown Venue';
  };

  const totalEstimatedTime = runVenues.reduce((sum, rv) => 
    sum + (rv.estimated_time_minutes || 0), 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{run ? 'Edit Run' : 'Create New Run'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="venues">
              Venues & Route ({runVenues.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Run Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Yorke Peninsula Run, South Run"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this run..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom Schedule</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Schedules will be automatically generated for the next 3 months
                </p>
              </div>

              <div>
                <Label>Assign To Staff Member (Optional)</Label>
                <Select
                  value={formData.assigned_to || 'unassigned'}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    assigned_to: value === 'unassigned' ? '' : value 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.username} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active">Active (show in schedules)</Label>
              </div>

              <ImageUpload
                folder="runs"
                currentImage={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              />

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : run ? 'Update Run' : 'Create Run'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="venues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add Venues to Run</CardTitle>
                <p className="text-xs text-gray-600">
                  Select venues in the order they should be visited. Drag to reorder.
                </p>
              </CardHeader>
              <CardContent>
                <Select onValueChange={addVenue} value="">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a venue to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map(venue => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name} {venue.address && `- ${venue.address}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {runVenues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Run Route ({runVenues.length} venues)</span>
                    <Badge variant="outline">
                      Total time: {Math.floor(totalEstimatedTime / 60)}h {totalEstimatedTime % 60}m
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {runVenues.map((rv, index) => {
                    const venue = venues.find(v => v.id === rv.venue_id);
                    const venueMachines = getMachinesForVenue(rv.venue_id);
                    
                    return (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className="border rounded-lg p-3 bg-white cursor-move hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                              {index + 1}
                            </div>
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-red-500" />
                                  {venue?.name}
                                </h4>
                                {venue?.address && (
                                  <p className="text-xs text-gray-500">{venue.address}</p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeVenue(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Estimated Time (minutes)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={rv.estimated_time_minutes || 30}
                                  onChange={(e) => updateVenueTime(index, parseInt(e.target.value))}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Machines at Venue</Label>
                                <div className="h-8 flex items-center">
                                  <Badge variant="secondary">
                                    {venueMachines.length} machine{venueMachines.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs">Notes (optional)</Label>
                              <Input
                                placeholder="Special instructions for this venue..."
                                value={rv.notes || ''}
                                onChange={(e) => updateVenueNotes(index, e.target.value)}
                                className="h-8"
                              />
                            </div>

                            {venueMachines.length > 0 && (
                              <div className="bg-gray-50 p-2 rounded text-xs">
                                <strong>Machines:</strong>{' '}
                                {venueMachines.map(m => m.name).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {runVenues.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No venues added yet. Select venues from the dropdown above.</p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? 'Saving...' : run ? 'Update Run' : 'Create Run'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default RunEditDialog;