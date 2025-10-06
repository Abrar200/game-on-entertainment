import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, Eye, Calendar, Map, List, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import RunEditDialog from './RunEditDialog';
import RunProfile from './RunProfile';
import RunCalendar from './RunCalendar';
import RunMap from './RunMap';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import { createImageWithFallback } from '@/lib/imageUtils';

interface Run {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  frequency: string;
  frequency_details?: any;
  assigned_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    full_name?: string;
    username?: string;
  };
  venues?: any[];
  venue_count?: number;
  machine_count?: number;
}

interface RunsManagerProps {
  userRole: string;
  hasPermission: (permission: string) => boolean;
}

const RunsManager: React.FC<RunsManagerProps> = ({ userRole, hasPermission }) => {
  const { toast } = useToast();
  const { venues, machines } = useAppContext();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  // Permission checks
  const canEdit = hasPermission('manage_venues') || ['admin', 'super_admin', 'manager'].includes(userRole);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      console.log('📋 Fetching runs...');
      
      const { data: runsData, error: runsError } = await supabase
        .from('runs')
        .select(`
          *,
          assigned_user:users!runs_assigned_to_fkey(
            full_name,
            username
          )
        `)
        .order('name', { ascending: true });

      if (runsError) throw runsError;

      // Fetch venue and machine counts for each run
      const runsWithCounts = await Promise.all(
        (runsData || []).map(async (run) => {
          const { data: venueData } = await supabase
            .from('run_venues')
            .select('venue_id, venues(id, name)')
            .eq('run_id', run.id)
            .order('sequence_order', { ascending: true });

          const venueIds = venueData?.map(rv => rv.venue_id) || [];
          
          // Count machines at these venues
          const machineCount = machines.filter(m => 
            m.venue_id && venueIds.includes(m.venue_id)
          ).length;

          return {
            ...run,
            venues: venueData || [],
            venue_count: venueData?.length || 0,
            machine_count: machineCount
          };
        })
      );

      setRuns(runsWithCounts);
      console.log('✅ Runs fetched:', runsWithCounts.length);
    } catch (error) {
      console.error('❌ Error fetching runs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load runs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRun) return;

    try {
      const { error } = await supabase
        .from('runs')
        .delete()
        .eq('id', selectedRun.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Run "${selectedRun.name}" deleted successfully`
      });

      await fetchRuns();
    } catch (error) {
      console.error('❌ Error deleting run:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete run',
        variant: 'destructive'
      });
    } finally {
      setShowDeleteDialog(false);
      setSelectedRun(null);
    }
  };

  const filteredRuns = runs.filter(run => {
    const searchLower = searchTerm.toLowerCase();
    return (
      run.name.toLowerCase().includes(searchLower) ||
      run.description?.toLowerCase().includes(searchLower) ||
      run.assigned_user?.full_name?.toLowerCase().includes(searchLower) ||
      run.assigned_user?.username?.toLowerCase().includes(searchLower)
    );
  });

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      weekly: 'bg-green-100 text-green-800',
      biweekly: 'bg-blue-100 text-blue-800',
      monthly: 'bg-purple-100 text-purple-800',
      custom: 'bg-orange-100 text-orange-800'
    };
    return colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const renderRunCard = (run: Run) => {
    const machineImage = run.image_url ? createImageWithFallback(run.image_url, run.name, 'run') : null;

    return (
      <Card key={run.id} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg">{run.name}</CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={getFrequencyBadge(run.frequency)}>
                  {run.frequency}
                </Badge>
                {run.assigned_user && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {run.assigned_user.full_name || run.assigned_user.username}
                  </Badge>
                )}
                {!run.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRun(run);
                    setShowEditDialog(true);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRun(run);
                    setShowDeleteDialog(true);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {machineImage && (
            <div className="w-full h-32 rounded overflow-hidden">
              <img
                src={machineImage.src}
                alt={run.name}
                className="w-full h-full object-cover"
                onError={machineImage.onError}
                crossOrigin="anonymous"
              />
            </div>
          )}
          
          {run.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{run.description}</p>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-blue-50 p-2 rounded">
              <div className="text-blue-600 font-semibold">{run.venue_count || 0}</div>
              <div className="text-blue-700 text-xs">Venues</div>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <div className="text-green-600 font-semibold">{run.machine_count || 0}</div>
              <div className="text-green-700 text-xs">Machines</div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedRun(run);
              setShowProfile(true);
            }}
            className="w-full"
          >
            <Eye className="h-3 w-3 mr-2" />
            View Details
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🚗 Run Management</h2>
          <p className="text-gray-600 mt-1">
            Manage service runs and schedules • {filteredRuns.length} run{filteredRuns.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setSelectedRun(null);
              setShowEditDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Run
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search runs by name, description, or assigned staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Map View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading runs...</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRuns.map(renderRunCard)}
              </div>

              {filteredRuns.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">
                      {searchTerm
                        ? `No runs match your search for "${searchTerm}"`
                        : 'No runs created yet. Click "Create New Run" to get started.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <RunCalendar runs={runs} onRunSelect={(run) => {
            setSelectedRun(run);
            setShowProfile(true);
          }} />
        </TabsContent>

        <TabsContent value="map">
          <RunMap runs={runs} venues={venues} machines={machines} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RunEditDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedRun(null);
        }}
        run={selectedRun}
        onSave={() => {
          setShowEditDialog(false);
          setSelectedRun(null);
          fetchRuns();
        }}
      />

      {selectedRun && (
        <RunProfile
          run={selectedRun}
          isOpen={showProfile}
          onClose={() => {
            setShowProfile(false);
            setSelectedRun(null);
          }}
          canEdit={canEdit}
          onEdit={() => {
            setShowProfile(false);
            setShowEditDialog(true);
          }}
          onRefresh={fetchRuns}
        />
      )}

      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedRun(null);
        }}
        onConfirm={handleDelete}
        title="Delete Run"
        description={`Are you sure you want to delete "${selectedRun?.name}"? This will remove all associated venues, tasks, and schedules.`}
      />
    </div>
  );
};

export default RunsManager;