import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  RefreshCw, 
  DollarSign, 
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle,
  Settings,
  Plus // FIXED: Added missing Plus import
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, differenceInMonths, parseISO } from 'date-fns';

interface MachineRotation {
  id?: string;
  machine_id: string;
  rotation_period: 3 | 6 | 12; // months
  last_rotation_date: string;
  rotation_threshold: number; // dollars per month
  created_at?: string;
  updated_at?: string;
}

interface MachineWithRotationData {
  id: string;
  name: string;
  type: string;
  venue?: { name: string };
  image_url?: string;
  rotation: MachineRotation | null;
  earnings: {
    monthly: number;
    weekly: number;
    total30Days: number;
  };
  rotationStatus: {
    needsRotation: boolean;
    reason: 'period' | 'earnings' | 'both' | 'none';
    daysOverdue?: number;
    monthsUntilNext?: number;
  };
}

const MachineRotationsCalendar: React.FC = () => {
  const { machines, venues, refreshData } = useAppContext();
  const { toast } = useToast();
  const [machinesWithRotations, setMachinesWithRotations] = useState<MachineWithRotationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<MachineWithRotationData | null>(null);
  const [showRotationDialog, setShowRotationDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  
  // Rotation form state
  const [rotationForm, setRotationForm] = useState({
    rotation_period: 6 as 3 | 6 | 12,
    rotation_threshold: 300,
    last_rotation_date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    loadMachineRotationData();
  }, [machines]);

  const loadMachineRotationData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading machine rotation data...');
      
      const machinesWithData = await Promise.all(
        machines.map(async (machine) => {
          // Get rotation settings
          const { data: rotationData } = await supabase
            .from('machine_rotations')
            .select('*')
            .eq('machine_id', machine.id)
            .single();

          // Get earnings data from last 30 days
          const earnings = await calculateMachineEarnings(machine.id);
          
          // Determine rotation status
          const rotationStatus = determineRotationStatus(rotationData, earnings);

          const machineWithData: MachineWithRotationData = {
            id: machine.id,
            name: machine.name,
            type: machine.type,
            venue: machine.venue,
            image_url: machine.image_url,
            rotation: rotationData,
            earnings,
            rotationStatus
          };

          return machineWithData;
        })
      );

      setMachinesWithRotations(machinesWithData);
      console.log('✅ Loaded machine rotation data for', machinesWithData.length, 'machines');
    } catch (error) {
      console.error('❌ Error loading machine rotation data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load machine rotation data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMachineEarnings = async (machineId: string) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { data: reports } = await supabase
        .from('machine_reports')
        .select('money_collected, report_date, created_at')
        .eq('machine_id', machineId)
        .gte('report_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('report_date', { ascending: false });

      const total30Days = reports?.reduce((sum, report) => sum + (report.money_collected || 0), 0) || 0;
      const monthly = total30Days; // Approximate monthly from 30 days
      const weekly = total30Days / 4.33; // Average weeks per month

      return { monthly, weekly, total30Days };
    } catch (error) {
      console.error('Error calculating earnings for machine', machineId, ':', error);
      return { monthly: 0, weekly: 0, total30Days: 0 };
    }
  };

  const determineRotationStatus = (rotationData: MachineRotation | null, earnings: any) => {
    if (!rotationData) {
      return {
        needsRotation: false,
        reason: 'none' as const,
      };
    }

    const now = new Date();
    const lastRotation = parseISO(rotationData.last_rotation_date);
    const monthsSinceRotation = differenceInMonths(now, lastRotation);
    
    const isPeriodOverdue = monthsSinceRotation >= rotationData.rotation_period;
    const isEarningsLow = earnings.monthly < rotationData.rotation_threshold;

    if (isPeriodOverdue && isEarningsLow) {
      return {
        needsRotation: true,
        reason: 'both' as const,
        daysOverdue: Math.max(0, Math.floor((now.getTime() - addMonths(lastRotation, rotationData.rotation_period).getTime()) / (1000 * 60 * 60 * 24))),
        monthsUntilNext: 0
      };
    } else if (isEarningsLow) {
      return {
        needsRotation: true,
        reason: 'earnings' as const,
        monthsUntilNext: Math.max(0, rotationData.rotation_period - monthsSinceRotation)
      };
    } else if (isPeriodOverdue) {
      return {
        needsRotation: true,
        reason: 'period' as const,
        daysOverdue: Math.max(0, Math.floor((now.getTime() - addMonths(lastRotation, rotationData.rotation_period).getTime()) / (1000 * 60 * 60 * 24))),
        monthsUntilNext: 0
      };
    } else {
      return {
        needsRotation: false,
        reason: 'none' as const,
        monthsUntilNext: Math.max(0, rotationData.rotation_period - monthsSinceRotation)
      };
    }
  };

  const handleSetupRotation = (machine: MachineWithRotationData) => {
    setSelectedMachine(machine);
    
    // Pre-fill form with existing data or defaults
    if (machine.rotation) {
      setRotationForm({
        rotation_period: machine.rotation.rotation_period,
        rotation_threshold: machine.rotation.rotation_threshold,
        last_rotation_date: machine.rotation.last_rotation_date.split('T')[0] // Format for date input
      });
    } else {
      setRotationForm({
        rotation_period: 6,
        rotation_threshold: 300,
        last_rotation_date: format(new Date(), 'yyyy-MM-dd')
      });
    }
    
    setShowRotationDialog(true);
  };

  const handleSaveRotation = async () => {
    if (!selectedMachine) return;

    try {
      console.log('💾 Saving rotation settings for machine:', selectedMachine.name);

      const rotationData = {
        machine_id: selectedMachine.id,
        rotation_period: rotationForm.rotation_period,
        rotation_threshold: rotationForm.rotation_threshold,
        last_rotation_date: rotationForm.last_rotation_date,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('machine_rotations')
        .upsert(rotationData, { 
          onConflict: 'machine_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Rotation settings saved for ${selectedMachine.name}`
      });

      setShowRotationDialog(false);
      setSelectedMachine(null);
      
      // Refresh data to show updated rotation status
      await loadMachineRotationData();

    } catch (error) {
      console.error('❌ Error saving rotation settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save rotation settings',
        variant: 'destructive'
      });
    }
  };

  const handleMarkRotated = async (machine: MachineWithRotationData) => {
    if (!machine.rotation) return;

    try {
      console.log('🔄 Marking machine as rotated:', machine.name);

      const { error } = await supabase
        .from('machine_rotations')
        .update({ 
          last_rotation_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('machine_id', machine.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${machine.name} marked as rotated`
      });

      // Refresh data
      await loadMachineRotationData();

    } catch (error) {
      console.error('❌ Error marking machine as rotated:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rotation status',
        variant: 'destructive'
      });
    }
  };

  // Get machines that need rotation on selected date
  const getMachinesForDate = (date: Date) => {
    return machinesWithRotations.filter(machine => {
      if (!machine.rotation) return false;
      
      const nextRotationDate = addMonths(parseISO(machine.rotation.last_rotation_date), machine.rotation.rotation_period);
      return format(nextRotationDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  // Get machines that are overdue
  const getOverdueMachines = () => {
    return machinesWithRotations.filter(machine => machine.rotationStatus.needsRotation);
  };

  // Get upcoming rotations (next 30 days)
  const getUpcomingRotations = () => {
    const now = new Date();
    const thirtyDaysFromNow = addMonths(now, 1);
    
    return machinesWithRotations.filter(machine => {
      if (!machine.rotation || machine.rotationStatus.needsRotation) return false;
      
      const nextRotationDate = addMonths(parseISO(machine.rotation.last_rotation_date), machine.rotation.rotation_period);
      return nextRotationDate >= now && nextRotationDate <= thirtyDaysFromNow;
    });
  };

  const getStatusColor = (status: MachineWithRotationData['rotationStatus']) => {
    if (!status.needsRotation) return 'bg-green-100 text-green-800';
    
    switch (status.reason) {
      case 'earnings': return 'bg-orange-100 text-orange-800';
      case 'period': return 'bg-blue-100 text-blue-800';
      case 'both': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: MachineWithRotationData['rotationStatus']) => {
    if (!status.needsRotation) return <CheckCircle className="h-4 w-4" />;
    
    switch (status.reason) {
      case 'earnings': return <TrendingDown className="h-4 w-4" />;
      case 'period': return <Clock className="h-4 w-4" />;
      case 'both': return <AlertTriangle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusMessage = (machine: MachineWithRotationData) => {
    const { rotationStatus, earnings, rotation } = machine;
    
    if (!rotation) return 'No rotation schedule set';
    
    if (!rotationStatus.needsRotation) {
      return `Next rotation in ${rotationStatus.monthsUntilNext?.toFixed(1)} months`;
    }
    
    switch (rotationStatus.reason) {
      case 'earnings':
        return `Low earnings: ${earnings.monthly.toFixed(0)}/month < ${rotation.rotation_threshold} threshold`;
      case 'period':
        return `Overdue by ${rotationStatus.daysOverdue} days`;
      case 'both':
        return `Overdue ${rotationStatus.daysOverdue} days & low earnings (${earnings.monthly.toFixed(0)}/month)`;
      default:
        return 'Unknown status';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin mr-3" />
        <span>Loading machine rotation data...</span>
      </div>
    );
  }

  const overdueMachines = getOverdueMachines();
  const upcomingRotations = getUpcomingRotations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Machine Rotations</h2>
          <p className="text-gray-600 mt-2">Manage machine rotation schedules and earnings tracking</p>
        </div>
        <Button onClick={loadMachineRotationData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{overdueMachines.length}</div>
                <div className="text-sm text-gray-600">Need Rotation</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{upcomingRotations.length}</div>
                <div className="text-sm text-gray-600">Due This Month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {machinesWithRotations.filter(m => !m.rotationStatus.needsRotation).length}
                </div>
                <div className="text-sm text-gray-600">On Schedule</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Settings className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {machinesWithRotations.filter(m => !m.rotation).length}
                </div>
                <div className="text-sm text-gray-600">No Schedule</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            Overdue
            {overdueMachines.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {overdueMachines.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {machinesWithRotations.map((machine) => (
              <Card key={machine.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {machine.image_url && (
                        <img
                          src={machine.image_url}
                          alt={machine.name}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      )}
                      <div>
                        <CardTitle className="text-lg">{machine.name}</CardTitle>
                        <p className="text-sm text-gray-600">{machine.venue?.name}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(machine.rotationStatus)}>
                      {getStatusIcon(machine.rotationStatus)}
                      <span className="ml-1">
                        {machine.rotationStatus.needsRotation ? 'Needs Rotation' : 'On Schedule'}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Monthly Earnings:</span>
                      <span className="font-medium">${machine.earnings.monthly.toFixed(0)}</span>
                    </div>
                    {machine.rotation && (
                      <>
                        <div className="flex justify-between">
                          <span>Threshold:</span>
                          <span className="font-medium">${machine.rotation.rotation_threshold}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rotation Period:</span>
                          <span className="font-medium">{machine.rotation.rotation_period} months</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 border-t pt-2">
                    {getStatusMessage(machine)}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {machine.rotation ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetupRotation(machine)}
                          className="flex-1"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {machine.rotationStatus.needsRotation && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkRotated(machine)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Rotated
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSetupRotation(machine)}
                        className="w-full"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Setup Rotation
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rotation Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Rotations for {format(selectedDate, 'MMM d, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const machinesForDate = getMachinesForDate(selectedDate);
                    return machinesForDate.length > 0 ? (
                      <div className="space-y-2">
                        {machinesForDate.map((machine) => (
                          <div key={machine.id} className="p-3 border rounded-lg">
                            <div className="font-medium">{machine.name}</div>
                            <div className="text-sm text-gray-600">{machine.venue?.name}</div>
                            <div className="text-sm">
                              Earnings: ${machine.earnings.monthly.toFixed(0)}/month
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No rotations scheduled for this date
                      </p>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {overdueMachines.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {overdueMachines.map((machine) => (
                <Card key={machine.id} className="border-red-200 bg-red-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {machine.image_url && (
                          <img
                            src={machine.image_url}
                            alt={machine.name}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        )}
                        <div>
                          <CardTitle className="text-lg">{machine.name}</CardTitle>
                          <p className="text-sm text-gray-600">{machine.venue?.name}</p>
                        </div>
                      </div>
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Monthly Earnings:</span>
                        <span className={`font-medium ${
                          machine.earnings.monthly < (machine.rotation?.rotation_threshold || 300)
                            ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ${machine.earnings.monthly.toFixed(0)}
                        </span>
                      </div>
                      {machine.rotation && (
                        <div className="flex justify-between">
                          <span>Threshold:</span>
                          <span className="font-medium">${machine.rotation.rotation_threshold}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-sm font-medium text-red-600 border-t pt-2">
                      {getStatusMessage(machine)}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleMarkRotated(machine)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark as Rotated
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">All Caught Up!</h3>
                <p className="text-gray-600">No machines currently need rotation</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingRotations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingRotations.map((machine) => {
                const nextRotationDate = addMonths(
                  parseISO(machine.rotation!.last_rotation_date), 
                  machine.rotation!.rotation_period
                );
                
                return (
                  <Card key={machine.id} className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {machine.image_url && (
                            <img
                              src={machine.image_url}
                              alt={machine.name}
                              className="w-12 h-12 object-cover rounded border"
                            />
                          )}
                          <div>
                            <CardTitle className="text-lg">{machine.name}</CardTitle>
                            <p className="text-sm text-gray-600">{machine.venue?.name}</p>
                          </div>
                        </div>
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Next Rotation:</span>
                          <span className="font-medium text-blue-600">
                            {format(nextRotationDate, 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Monthly Earnings:</span>
                          <span className="font-medium text-green-600">
                            ${machine.earnings.monthly.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Upcoming Rotations</h3>
                <p className="text-gray-500">No machines scheduled for rotation this month</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Rotation Setup Dialog */}
      <Dialog open={showRotationDialog} onOpenChange={setShowRotationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedMachine?.rotation ? 'Edit' : 'Setup'} Rotation Schedule
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Configure rotation settings for {selectedMachine?.name}
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Rotation Period</Label>
              <Select 
                value={rotationForm.rotation_period.toString()} 
                onValueChange={(value) => setRotationForm({
                  ...rotationForm, 
                  rotation_period: parseInt(value) as 3 | 6 | 12
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Every 3 months</SelectItem>
                  <SelectItem value="6">Every 6 months</SelectItem>
                  <SelectItem value="12">Every 12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Earnings Threshold ($/month)</Label>
              <Input
                type="number"
                value={rotationForm.rotation_threshold}
                onChange={(e) => setRotationForm({
                  ...rotationForm,
                  rotation_threshold: parseInt(e.target.value) || 0
                })}
                placeholder="300"
              />
              <p className="text-xs text-gray-500 mt-1">
                Machine will be flagged for rotation if monthly earnings fall below this amount
              </p>
            </div>

            <div>
              <Label>Last Rotation Date</Label>
              <Input
                type="date"
                value={rotationForm.last_rotation_date}
                onChange={(e) => setRotationForm({
                  ...rotationForm,
                  last_rotation_date: e.target.value
                })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRotationDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRotation}
                className="flex-1"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MachineRotationsCalendar;