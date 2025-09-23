import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Wrench, 
  Calendar, 
  DollarSign, 
  Package, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  User,
  FileText,
  TrendingUp,
  History,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';

interface MaintenanceRecord {
  id: string;
  machine_id: string;
  date: string;
  type: 'job' | 'parts' | 'manual';
  category: 'routine' | 'repair' | 'cleaning' | 'upgrade' | 'parts_replacement' | 'inspection';
  title: string;
  description: string;
  technician?: string;
  cost: number;
  parts_used?: any[];
  status?: string;
  priority?: string;
  source_id?: string; // Reference to original job or parts record
}

interface MachineMaintenanceHistoryProps {
  machineId: string;
  machineName: string;
}

const MachineMaintenanceHistory: React.FC<MachineMaintenanceHistoryProps> = ({ 
  machineId, 
  machineName 
}) => {
  const { parts } = useAppContext();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
  const { toast } = useToast();

  const [newRecord, setNewRecord] = useState({
    category: 'routine' as MaintenanceRecord['category'],
    title: '',
    description: '',
    technician: '',
    cost: 0,
    parts_used: [] as string[]
  });

  const categoryConfig = {
    routine: { label: 'Routine Maintenance', color: 'bg-blue-100 text-blue-800', icon: Calendar },
    repair: { label: 'Repair', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    cleaning: { label: 'Cleaning', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    upgrade: { label: 'Upgrade', color: 'bg-purple-100 text-purple-800', icon: TrendingUp },
    parts_replacement: { label: 'Parts Replacement', color: 'bg-orange-100 text-orange-800', icon: Package },
    inspection: { label: 'Inspection', color: 'bg-gray-100 text-gray-800', icon: Settings }
  };

  useEffect(() => {
    fetchMaintenanceHistory();
  }, [machineId]);

  const fetchMaintenanceHistory = async () => {
    setLoading(true);
    try {
      console.log('🔧 Fetching maintenance history for machine:', machineName);

      const allRecords: MaintenanceRecord[] = [];

      // 1. Fetch completed jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
      } else if (jobs) {
        jobs.forEach(job => {
          allRecords.push({
            id: `job-${job.id}`,
            machine_id: machineId,
            date: job.completed_at || job.created_at,
            type: 'job',
            category: job.status === 'completed' ? 'repair' : 'routine',
            title: job.title,
            description: job.description || '',
            technician: job.completed_by || 'Unknown',
            cost: 0, // Could be calculated from parts used
            status: job.status,
            priority: job.priority,
            source_id: job.id
          });
        });
      }

      // 2. Fetch parts usage history
      const { data: machinePartsUsage, error: partsError } = await supabase
        .from('machine_parts')
        .select(`
          *,
          parts!inner(
            name,
            cost_price,
            description
          )
        `)
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false });

      if (partsError) {
        console.error('Error fetching machine parts:', partsError);
      } else if (machinePartsUsage) {
        // Group parts by date to combine into single maintenance records
        const partsByDate = new Map<string, any[]>();
        
        machinePartsUsage.forEach(partUsage => {
          const date = partUsage.created_at.split('T')[0]; // Get date part only
          if (!partsByDate.has(date)) {
            partsByDate.set(date, []);
          }
          partsByDate.get(date)?.push(partUsage);
        });

        partsByDate.forEach((parts, date) => {
          const totalCost = parts.reduce((sum, part) => 
            sum + (part.parts?.cost_price * part.quantity || 0), 0
          );
          
          const partsNames = parts.map(part => 
            `${part.parts?.name} (x${part.quantity})`
          ).join(', ');

          allRecords.push({
            id: `parts-${date}-${machineId}`,
            machine_id: machineId,
            date: date + 'T12:00:00Z', // Add time to make it sortable
            type: 'parts',
            category: 'parts_replacement',
            title: `Parts Installation - ${parts.length} item(s)`,
            description: `Installed: ${partsNames}`,
            technician: 'Maintenance Team',
            cost: totalCost,
            parts_used: parts
          });
        });
      }

      // 3. Fetch manual maintenance records
      const { data: manualRecords, error: manualError } = await supabase
        .from('machine_maintenance_history')
        .select('*')
        .eq('machine_id', machineId)
        .order('maintenance_date', { ascending: false });

      if (manualError && manualError.code !== 'PGRST116') {
        console.error('Error fetching manual maintenance records:', manualError);
      } else if (manualRecords) {
        manualRecords.forEach(record => {
          allRecords.push({
            id: `manual-${record.id}`,
            machine_id: machineId,
            date: record.maintenance_date || record.created_at,
            type: 'manual',
            category: record.maintenance_type?.toLowerCase() || 'routine',
            title: record.maintenance_type || 'Maintenance',
            description: record.description || '',
            technician: record.technician || 'Unknown',
            cost: record.cost || 0,
            parts_used: record.parts_used || [],
            source_id: record.id
          });
        });
      }

      // Sort all records by date (most recent first)
      allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecords(allRecords);
      console.log('✅ Maintenance history loaded:', allRecords.length, 'records');

    } catch (error) {
      console.error('❌ Error fetching maintenance history:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load maintenance history', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRecord.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a maintenance title',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('📝 Adding manual maintenance record...');

      // Create the table if it doesn't exist, or insert into existing table
      const recordData = {
        machine_id: machineId,
        maintenance_date: new Date().toISOString(),
        maintenance_type: newRecord.category,
        description: newRecord.description,
        technician: newRecord.technician || 'Unknown',
        cost: newRecord.cost,
        parts_used: newRecord.parts_used.length > 0 ? newRecord.parts_used : null
      };

      const { error } = await supabase
        .from('machine_maintenance_history')
        .insert([recordData]);

      if (error) {
        // If table doesn't exist, show a helpful message
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('machine_maintenance_history table does not exist');
          toast({
            title: 'Database Setup Required',
            description: 'The maintenance history table needs to be created. Please contact your administrator.',
            variant: 'destructive'
          });
          return;
        }
        throw error;
      }
      
      toast({ 
        title: 'Success', 
        description: 'Maintenance record added successfully' 
      });
      
      setShowAddDialog(false);
      setNewRecord({ 
        category: 'routine', 
        title: '', 
        description: '', 
        technician: '', 
        cost: 0, 
        parts_used: [] 
      });
      
      await fetchMaintenanceHistory();
      
    } catch (error) {
      console.error('❌ Error adding maintenance record:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to add maintenance record', 
        variant: 'destructive' 
      });
    }
  };

  const getRecordTypeIcon = (record: MaintenanceRecord) => {
    switch (record.type) {
      case 'job':
        return <Wrench className="h-4 w-4" />;
      case 'parts':
        return <Package className="h-4 w-4" />;
      case 'manual':
        return <User className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getRecordTypeLabel = (type: MaintenanceRecord['type']) => {
    switch (type) {
      case 'job': return 'Job/Service';
      case 'parts': return 'Parts Installation';
      case 'manual': return 'Manual Entry';
      default: return 'Unknown';
    }
  };

  // Calculate statistics
  const totalCost = records.reduce((sum, record) => sum + record.cost, 0);
  const jobsCompleted = records.filter(r => r.type === 'job' && r.status === 'completed').length;
  const partsInstallations = records.filter(r => r.type === 'parts').length;
  const manualEntries = records.filter(r => r.type === 'manual').length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading maintenance history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{records.length}</div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{jobsCompleted}</div>
                <div className="text-sm text-gray-600">Jobs Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{partsInstallations}</div>
                <div className="text-sm text-gray-600">Parts Installed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">${totalCost.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Maintenance History - {machineName}
          </CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Manual Record
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4 mt-6">
              {records.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No maintenance history found for this machine.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {records.map((record, index) => {
                    const categoryInfo = categoryConfig[record.category] || categoryConfig.routine;
                    const CategoryIcon = categoryInfo.icon;
                    
                    return (
                      <div key={record.id} className="relative">
                        {/* Timeline line */}
                        {index < records.length - 1 && (
                          <div className="absolute left-6 top-12 w-px h-16 bg-gray-200"></div>
                        )}
                        
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                              {getRecordTypeIcon(record)}
                            </div>
                          </div>
                          
                          <Card className="flex-1">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg">{record.title}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={categoryInfo.color}>
                                      <CategoryIcon className="h-3 w-3 mr-1" />
                                      {categoryInfo.label}
                                    </Badge>
                                    <Badge variant="outline">
                                      {getRecordTypeLabel(record.type)}
                                    </Badge>
                                    {record.status && (
                                      <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                                        {record.status}
                                      </Badge>
                                    )}
                                    {record.priority && (
                                      <Badge variant={record.priority === 'urgent' ? 'destructive' : 'outline'}>
                                        {record.priority} priority
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">${record.cost.toFixed(2)}</div>
                                  <div className="text-xs text-gray-500">{formatDate(record.date)}</div>
                                </div>
                              </div>
                              
                              {record.description && (
                                <p className="text-gray-600 mb-3">{record.description}</p>
                              )}
                              
                              <div className="flex items-center justify-between text-sm text-gray-500">
                                <div className="flex items-center gap-4">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {record.technician || 'Unknown'}
                                  </span>
                                  {record.parts_used && record.parts_used.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Package className="h-3 w-3" />
                                      {Array.isArray(record.parts_used) ? record.parts_used.length : 'Multiple'} parts used
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="table" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const categoryInfo = categoryConfig[record.category] || categoryConfig.routine;
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm">
                          {formatDate(record.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRecordTypeIcon(record)}
                            <span className="text-sm">{getRecordTypeLabel(record.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={categoryInfo.color} variant="outline">
                            {categoryInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{record.title}</TableCell>
                        <TableCell>{record.technician || 'Unknown'}</TableCell>
                        <TableCell className="font-medium">${record.cost.toFixed(2)}</TableCell>
                        <TableCell>
                          {record.status ? (
                            <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                              {record.status}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cost Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Cost Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(categoryConfig).map(([key, config]) => {
                        const categoryRecords = records.filter(r => r.category === key);
                        const categoryCost = categoryRecords.reduce((sum, r) => sum + r.cost, 0);
                        const percentage = totalCost > 0 ? (categoryCost / totalCost * 100) : 0;
                        
                        if (categoryRecords.length === 0) return null;
                        
                        return (
                          <div key={key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={config.color} variant="outline">
                                {config.label}
                              </Badge>
                              <span className="text-sm text-gray-600">({categoryRecords.length})</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${categoryCost.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Maintenance Patterns */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Maintenance Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Most Common Issues</h4>
                        <div className="space-y-2">
                          {Object.entries(
                            records.reduce((acc, record) => {
                              acc[record.category] = (acc[record.category] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          )
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 3)
                            .map(([category, count]) => (
                              <div key={category} className="flex justify-between text-sm">
                                <span>{categoryConfig[category as keyof typeof categoryConfig]?.label || category}</span>
                                <span className="font-medium">{count} times</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Average Costs</h4>
                        <div className="text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Average per maintenance:</span>
                            <span className="font-medium">
                              ${records.length > 0 ? (totalCost / records.length).toFixed(2) : '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Monthly average:</span>
                            <span className="font-medium">
                              ${records.length > 0 ? (totalCost / Math.max(1, 
                                Math.ceil((new Date().getTime() - new Date(records[records.length - 1]?.date || new Date()).getTime()) / (30 * 24 * 60 * 60 * 1000))
                              )).toFixed(2) : '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Manual Record Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Maintenance Record</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddManualRecord} className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select 
                value={newRecord.category} 
                onValueChange={(value: MaintenanceRecord['category']) => 
                  setNewRecord({...newRecord, category: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title *</Label>
              <Input
                value={newRecord.title}
                onChange={(e) => setNewRecord({...newRecord, title: e.target.value})}
                placeholder="Enter maintenance title..."
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newRecord.description}
                onChange={(e) => setNewRecord({...newRecord, description: e.target.value})}
                placeholder="Describe what was done..."
                rows={3}
              />
            </div>

            <div>
              <Label>Technician</Label>
              <Input
                value={newRecord.technician}
                onChange={(e) => setNewRecord({...newRecord, technician: e.target.value})}
                placeholder="Who performed the work?"
              />
            </div>

            <div>
              <Label>Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newRecord.cost}
                onChange={(e) => setNewRecord({...newRecord, cost: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Record
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MachineMaintenanceHistory;