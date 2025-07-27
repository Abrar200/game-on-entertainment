import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, Clock, CheckCircle, Edit, Scan } from 'lucide-react';
import { MachineSerialSearch } from './MachineSerialSearch';
import { AutoBarcodeScanner } from './AutoBarcodeScanner';
import JobEditDialog from './JobEditDialog';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  title: string;
  description: string;
  machine_id: string;
  priority: 'low' | 'medium' | 'urgent';
  status: 'open' | 'in_progress' | 'completed';
  created_at: string;
  progress_updates?: string[];
  machine?: {
    name: string;
    type: string;
    venue?: { name: string };
  };
}

const JobsManager: React.FC = () => {
  const { machines, findMachineByBarcode } = useAppContext();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    machine_id: '',
    priority: 'medium' as 'low' | 'medium' | 'urgent'
  });

  const priorityConfig = {
    low: { label: 'Low Priority', color: 'bg-green-500 text-white', icon: CheckCircle },
    medium: { label: 'Medium Priority', color: 'bg-yellow-500 text-white', icon: Clock },
    urgent: { label: 'Urgent Priority', color: 'bg-red-500 text-white', icon: AlertTriangle }
  };

  const statusConfig = {
    open: { label: 'Open', color: 'bg-blue-500 text-white' },
    in_progress: { label: 'In Progress', color: 'bg-orange-500 text-white' },
    completed: { label: 'Completed', color: 'bg-green-500 text-white' }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          machine:machines(
            name,
            type,
            venue:venues(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load jobs',
        variant: 'destructive'
      });
    }
  };

  const sendJobNotification = async (job: any, machine: any, venue: any) => {
    try {
      const { error } = await supabase.functions.invoke('send-job-email', {
        body: { job, machine, venue }
      });
      
      if (error) {
        console.error('Email notification error:', error);
        // Don't fail the job creation if email fails
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const machine = await findMachineByBarcode(barcode);
      if (machine) {
        setFormData({...formData, machine_id: machine.id});
        toast({
          title: 'Machine Found',
          description: `Selected: ${machine.name}`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to find machine',
        variant: 'destructive'
      });
    }
    setIsScannerOpen(false);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a job title',
        variant: 'destructive'
      });
      return false;
    }
    
    if (!formData.machine_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a machine using the search above',
        variant: 'destructive'
      });
      return false;
    }

    const selectedMachine = machines?.find(m => m.id === formData.machine_id);
    if (!selectedMachine) {
      toast({
        title: 'Validation Error',
        description: 'Selected machine is invalid. Please search and select a machine again.',
        variant: 'destructive'
      });
      setFormData({...formData, machine_id: ''});
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert([{
          title: formData.title.trim(),
          description: formData.description.trim(),
          machine_id: formData.machine_id,
          priority: formData.priority,
          status: 'open'
        }])
        .select(`
          *,
          machine:machines(
            name,
            type,
            venue:venues(name, address)
          )
        `);

      if (error) throw error;
      
      // Send email notification
      if (data && data[0]) {
        await sendJobNotification(data[0], data[0].machine, data[0].machine?.venue);
      }
      
      setFormData({ title: '', description: '', machine_id: '', priority: 'medium' });
      setShowForm(false);
      await fetchJobs();
      
      toast({
        title: 'Success',
        description: 'Job created successfully and notifications sent!'
      });
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: 'Error',
        description: 'Failed to create job. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">🔧 Jobs & Faults</h2>
        <Button 
          onClick={() => setShowForm(true)} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={showForm}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Job
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-blue-800">Create New Job</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter job title..."
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the issue or task..."
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label>Select Machine *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsScannerOpen(true)}
                  >
                    <Scan className="h-4 w-4 mr-1" />
                    Scan Barcode
                  </Button>
                </div>
                
                <MachineSerialSearch
                  onMachineSelect={(machineId) => setFormData({...formData, machine_id: machineId})}
                  selectedMachineId={formData.machine_id}
                  label="Search by Serial Number, Name, or Barcode"
                  required
                />
              </div>

              <div>
                <Label>Priority Level</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: 'low' | 'medium' | 'urgent') => setFormData({...formData, priority: value})}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={loading || !formData.machine_id}
                >
                  {loading ? 'Creating...' : 'Create Job'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ title: '', description: '', machine_id: '', priority: 'medium' });
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {jobs.map((job) => {
          const priorityInfo = priorityConfig[job.priority];
          const statusInfo = statusConfig[job.status];
          const PriorityIcon = priorityInfo.icon;
          
          return (
            <Card key={job.id} className={`border-2 border-l-8 border-l-${job.priority === 'urgent' ? 'red' : job.priority === 'medium' ? 'yellow' : 'green'}-500`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <Badge className={priorityInfo.color}>
                        <PriorityIcon className="h-3 w-3 mr-1" />
                        {priorityInfo.label}
                      </Badge>
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {job.machine?.name} - {job.machine?.type}
                      {job.machine?.venue?.name && ` @ ${job.machine.venue.name}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditingJob(job)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {job.description && <p className="text-gray-700 mb-2">{job.description}</p>}
                <p className="text-xs text-gray-500">
                  Created: {new Date(job.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-gray-500">No jobs found. Click "Add New Job" to create one.</p>
          </CardContent>
        </Card>
      )}
      
      <JobEditDialog
        job={editingJob}
        open={!!editingJob}
        onClose={() => setEditingJob(null)}
        onUpdate={fetchJobs}
      />
      
      <AutoBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
};

export default JobsManager;