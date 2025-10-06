import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Users, Clock, Edit, Calendar, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { createImageWithFallback } from '@/lib/imageUtils';

interface RunProfileProps {
  run: any;
  isOpen: boolean;
  onClose: () => void;
  canEdit: boolean;
  onEdit: () => void;
  onRefresh: () => void;
}

const RunProfile: React.FC<RunProfileProps> = ({ 
  run, 
  isOpen, 
  onClose, 
  canEdit, 
  onEdit,
  onRefresh 
}) => {
  const { toast } = useToast();
  const { venues, machines } = useAppContext();
  const [runVenues, setRunVenues] = useState<any[]>([]);
  const [runTasks, setRunTasks] = useState<any[]>([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && run) {
      fetchRunDetails();
    }
  }, [isOpen, run]);

  const fetchRunDetails = async () => {
    setLoading(true);
    try {
      // Fetch run venues with venue details
      const { data: venuesData, error: venuesError } = await supabase
        .from('run_venues')
        .select('*, venues(*)')
        .eq('run_id', run.id)
        .order('sequence_order', { ascending: true });

      if (venuesError) throw venuesError;
      setRunVenues(venuesData || []);

      // Fetch run tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('run_tasks')
        .select('*, machines(*), venues(*)')
        .eq('run_id', run.id);

      if (tasksError) throw tasksError;
      setRunTasks(tasksData || []);

      // Fetch upcoming schedules
      const today = new Date().toISOString().split('T')[0];
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('run_schedules')
        .select('*')
        .eq('run_id', run.id)
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(5);

      if (schedulesError) throw schedulesError;
      setUpcomingSchedules(schedulesData || []);

    } catch (error) {
      console.error('Error fetching run details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load run details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('run_schedules')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Run marked as completed'
      });

      fetchRunDetails();
      onRefresh();
    } catch (error) {
      console.error('Error completing schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark run as completed',
        variant: 'destructive'
      });
    }
  };

  const getFrequencyText = (frequency: string) => {
    const map = {
      weekly: 'Every Week',
      biweekly: 'Every 2 Weeks',
      monthly: 'Every Month',
      custom: 'Custom Schedule'
    };
    return map[frequency as keyof typeof map] || frequency;
  };

  const getMachinesForVenue = (venueId: string) => {
    return machines.filter(m => m.venue_id === venueId);
  };

  const totalEstimatedTime = runVenues.reduce((sum, rv) => 
    sum + (rv.estimated_time_minutes || 0), 0
  );

  const totalMachines = runVenues.reduce((sum, rv) => 
    sum + getMachinesForVenue(rv.venue_id).length, 0
  );

  const runImage = run.image_url ? createImageWithFallback(run.image_url, run.name, 'run') : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{run.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge>{getFrequencyText(run.frequency)}</Badge>
                {run.assigned_user && (
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {run.assigned_user.full_name || run.assigned_user.username}
                  </Badge>
                )}
                {!run.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Run
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading run details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {runImage && (
                <Card className="md:col-span-3">
                  <CardContent className="p-4">
                    <img
                      src={runImage.src}
                      alt={run.name}
                      className="w-full h-48 object-cover rounded"
                      onError={runImage.onError}
                      crossOrigin="anonymous"
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{runVenues.length}</div>
                  <div className="text-sm text-gray-600">Venues</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{totalMachines}</div>
                  <div className="text-sm text-gray-600">Total Machines</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {Math.floor(totalEstimatedTime / 60)}h {totalEstimatedTime % 60}m
                  </div>
                  <div className="text-sm text-gray-600">Estimated Time</div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            {run.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{run.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Run Route */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">🗺️ Run Route</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {runVenues.map((rv, index) => {
                  const venueMachines = getMachinesForVenue(rv.venue_id);
                  const isLast = index === runVenues.length - 1;

                  return (
                    <div key={rv.id}>
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                            {index + 1}
                          </div>
                          {!isLast && (
                            <div className="w-0.5 h-12 bg-blue-200 my-1"></div>
                          )}
                        </div>

                        <div className="flex-1 pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-500" />
                              {rv.venues?.name}
                            </h4>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {rv.estimated_time_minutes || 30} min
                            </Badge>
                          </div>

                          {rv.venues?.address && (
                            <p className="text-sm text-gray-500 mb-2">{rv.venues.address}</p>
                          )}

                          {rv.notes && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm mb-2">
                              <strong>Note:</strong> {rv.notes}
                            </div>
                          )}

                          {venueMachines.length > 0 && (
                            <div className="bg-gray-50 rounded p-2">
                              <div className="text-xs font-semibold text-gray-700 mb-1">
                                Machines ({venueMachines.length}):
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {venueMachines.map(machine => (
                                  <Badge key={machine.id} variant="secondary" className="text-xs">
                                    {machine.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {runVenues.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No venues in this run yet</p>
                )}
              </CardContent>
            </Card>

            {/* Special Tasks */}
            {runTasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">🔧 Special Repeating Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {runTasks.map(task => (
                    <div key={task.id} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-sm">{task.machines?.name}</strong>
                        <Badge variant="outline" className="text-xs">
                          Every {task.frequency_interval} run{task.frequency_interval > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{task.task_description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        @ {task.venues?.name}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Schedules */}
            {upcomingSchedules.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Upcoming Schedules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {upcomingSchedules.map(schedule => (
                    <div key={schedule.id} className="flex items-center justify-between border rounded p-3">
                      <div>
                        <div className="font-semibold">
                          {new Date(schedule.scheduled_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        {schedule.notes && (
                          <p className="text-sm text-gray-600">{schedule.notes}</p>
                        )}
                      </div>
                      {!schedule.completed && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteSchedule(schedule.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                      {schedule.completed && (
                        <Badge className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RunProfile;