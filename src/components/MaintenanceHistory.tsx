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
import { Plus, Wrench, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface MaintenanceRecord {
  id: string;
  machine_id: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string;
  parts_used: any[];
  technician: string;
  cost: number;
}

interface MaintenanceHistoryProps {
  machineId: string;
  machineName: string;
}

const MaintenanceHistory: React.FC<MaintenanceHistoryProps> = ({ machineId, machineName }) => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [parts, setParts] = useState<any[]>([]);
  const { toast } = useToast();

  const [newRecord, setNewRecord] = useState({
    maintenance_type: '',
    description: '',
    parts_used: [] as string[],
    technician: '',
    cost: 0
  });

  useEffect(() => {
    fetchRecords();
    fetchParts();
  }, [machineId]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_maintenance_history')
        .select('*')
        .eq('machine_id', machineId)
        .order('maintenance_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load maintenance history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const { data, error } = await supabase.from('parts').select('*');
      if (error) throw error;
      setParts(data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('machine_maintenance_history')
        .insert({
          machine_id: machineId,
          ...newRecord,
          parts_used: newRecord.parts_used
        });

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Maintenance record added successfully' });
      setShowAddDialog(false);
      setNewRecord({ maintenance_type: '', description: '', parts_used: [], technician: '', cost: 0 });
      fetchRecords();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add maintenance record', variant: 'destructive' });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Maintenance History - {machineName}
        </CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Record</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Maintenance Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Maintenance Type</Label>
                <Select value={newRecord.maintenance_type} onValueChange={(value) => setNewRecord({...newRecord, maintenance_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Routine">Routine</SelectItem>
                    <SelectItem value="Repair">Repair</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="Upgrade">Upgrade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newRecord.description} onChange={(e) => setNewRecord({...newRecord, description: e.target.value})} />
              </div>
              <div>
                <Label>Technician</Label>
                <Input value={newRecord.technician} onChange={(e) => setNewRecord({...newRecord, technician: e.target.value})} />
              </div>
              <div>
                <Label>Cost</Label>
                <Input type="number" step="0.01" value={newRecord.cost} onChange={(e) => setNewRecord({...newRecord, cost: parseFloat(e.target.value) || 0})} />
              </div>
              <Button type="submit">Add Record</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{new Date(record.maintenance_date).toLocaleDateString()}</TableCell>
                <TableCell><Badge variant="outline">{record.maintenance_type}</Badge></TableCell>
                <TableCell>{record.description}</TableCell>
                <TableCell>{record.technician}</TableCell>
                <TableCell>${record.cost?.toFixed(2) || '0.00'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MaintenanceHistory;