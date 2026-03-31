import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle, Clock, CheckCircle, Edit, Scan, List, CalendarDays, Archive, History, Check, Search, Camera, Trash2, Loader2, User } from 'lucide-react';
import { MachineSerialSearch } from './MachineSerialSearch';
import { AutoBarcodeScanner } from './AutoBarcodeScanner';
import JobEditDialog from './JobEditDialog';
import JobsCalendar from './JobsCalendar';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
 
interface Job {
  id: string;
  title: string;
  description: string;
  machine_id: string;
  priority: 'low' | 'medium' | 'urgent';
  status: string;
  created_at: string;
  scheduled_date?: string;
  progress_updates?: string[];
  completed_at?: string;
  completed_by?: string;
  assigned_to?: string | null;
  archived?: boolean;
  machine?: {
    name: string;
    type: string;
    venue?: { name: string };
  };
}
 
interface JobsManagerProps {
  userRole?: string;
  hasPermission?: (permission: string) => boolean;
}
 
const JobsManager: React.FC<JobsManagerProps> = ({ 
  userRole = 'technician', 
  hasPermission = () => true 
}) => {
  const { machines, findMachineByBarcode } = useAppContext();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [staffMembers, setStaffMembers] = useState<{ id: string; full_name?: string; username?: string; role?: string }[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    machine_id: '',
    priority: 'medium' as 'low' | 'medium' | 'urgent',
    assigned_to: null as string | null,
  });
 
  const priorityConfig = {
    low: { label: 'Low Priority', color: 'bg-green-500 text-white', icon: CheckCircle },
    medium: { label: 'Medium Priority', color: 'bg-yellow-500 text-white', icon: Clock },
    urgent: { label: 'Urgent Priority', color: 'bg-red-500 text-white', icon: AlertTriangle }
  };
 
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    const statusConfigs = {
      'open': { label: 'Open', color: 'bg-blue-500 text-white' },
      'in_progress': { label: 'In Progress', color: 'bg-orange-500 text-white' },
      'completed': { label: 'Completed', color: 'bg-green-500 text-white' },
      'pending': { label: 'Pending', color: 'bg-gray-500 text-white' },
      'archived': { label: 'Archived', color: 'bg-purple-500 text-white' }
    };
    return statusConfigs[normalizedStatus] || { label: status, color: 'bg-gray-500 text-white' };
  };
 
  useEffect(() => {
    fetchJobs();
  }, []);
 
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, full_name, username, role')
          .eq('is_active', true)
          .order('full_name', { ascending: true });
        if (data) setStaffMembers(data);
      } catch (err) {
        console.warn('Could not fetch staff members:', err);
      }
    };
    fetchStaff();
  }, []);
 
  const fetchJobs = async (keepEditingJobClosed = false) => {
    try {
      console.log('📋 Fetching jobs...');
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
        .order('scheduled_date', { ascending: true })
        .order('created_at', { ascending: false });
 
      if (error) {
        console.error('❌ Error fetching jobs:', error);
        throw error;
      }
 
      console.log('✅ Jobs fetched:', data?.length || 0);
      
      // Separate active jobs from archived jobs
      const activeJobs = data?.filter(job => !job.archived) || [];
      const archived = data?.filter(job => job.archived) || [];
      
      setJobs(activeJobs);
      setArchivedJobs(archived);
 
      if (editingJob && data && !keepEditingJobClosed) {
        const updatedEditingJob = data.find(job => job.id === editingJob.id);
        if (updatedEditingJob) {
          console.log('🔄 Updating editing job with fresh data');
          setEditingJob(updatedEditingJob);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load jobs',
        variant: 'destructive'
      });
    }
  };
 
  const handleCompleteJob = async (job: Job) => {
    setCompletingJobId(job.id);
    
    try {
      console.log('✅ Completing job:', job.title);
      
      const updateData = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: 'current_user', // Replace with actual user info
        archived: true // Automatically archive when completed
      };
 
      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', job.id);
 
      if (error) throw error;
 
      // Add completion note to progress updates
      const completionUpdate = `${new Date().toISOString()}: Job marked as completed and archived`;
      const updatedProgressUpdates = [...(job.progress_updates || []), completionUpdate];
      
      await supabase
        .from('jobs')
        .update({ progress_updates: updatedProgressUpdates })
        .eq('id', job.id);
 
      toast({
        title: 'Job Completed',
        description: `${job.title} has been completed and archived`
      });
 
      await fetchJobs();
 
    } catch (error) {
      console.error('❌ Error completing job:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete job',
        variant: 'destructive'
      });
    } finally {
      setCompletingJobId(null);
    }
  };
 
  
  // CORRECTED handleRestoreJob function for JobsManager.tsx
 
  const handleRestoreJob = async (job: Job) => {
    try {
      console.log('🔄 Restoring job from archive:', job.title);
      
      // Prepare update data
      const updateData: any = { 
        archived: false,
        // Use 'pending' instead of 'open' - reset to pending when restoring completed jobs
        status: job.status === 'completed' ? 'pending' : job.status
      };
      
      // Clear scheduled_date if it's in the past (to avoid constraint violation)
      if (job.scheduled_date) {
        const scheduledDate = new Date(job.scheduled_date);
        const now = new Date();
        if (scheduledDate < now) {
          updateData.scheduled_date = null;
          console.log('⚠️ Clearing past scheduled_date on restore');
        }
      }
      
      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', job.id);
 
      if (error) {
        console.error('❌ Restore error details:', error);
        throw error;
      }
 
      const message = updateData.scheduled_date === null 
        ? `${job.title} has been restored to active jobs (past schedule date was cleared)`
        : `${job.title} has been restored to active jobs`;
 
      toast({
        title: 'Job Restored',
        description: message
      });
 
      await fetchJobs();
 
    } catch (error) {
      console.error('❌ Error restoring job:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore job',
        variant: 'destructive'
      });
    }
  };
 
  const sendJobNotification = async (job: any, machine: any, venue: any) => {
    try {
      console.log('📧 Sending job notification...');
      const { error } = await supabase.functions.invoke('send-job-email', {
        body: { job, machine, venue }
      });
 
      if (error) {
        console.error('❌ Email notification error:', error);
      } else {
        console.log('✅ Email notification sent');
      }
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
    }
  };
 
  const handleBarcodeScanned = async (barcode: string) => {
    console.log('📱 Barcode scanned in JobsManager:', barcode);
    try {
      const machine = await findMachineByBarcode(barcode);
      if (machine) {
        console.log('✅ Machine found for job creation:', machine.name);
        setFormData({ ...formData, machine_id: machine.id });
        toast({
          title: 'Machine Selected',
          description: `Selected: ${machine.name} for job creation`
        });
      }
    } catch (error) {
      console.error('❌ Error finding machine:', error);
      toast({
        title: 'Machine Not Found',
        description: 'Scanned barcode does not match any machine in the database',
        variant: 'destructive'
      });
    }
    setIsScannerOpen(false);
  };
 
  const validateForm = () => {
    console.log('🔍 Validating form data:', formData);
 
    if (!formData.title.trim()) {
      console.log('❌ Validation failed: No title');
      toast({
        title: 'Validation Error',
        description: 'Please enter a job title',
        variant: 'destructive'
      });
      return false;
    }
 
    if (!formData.machine_id) {
      console.log('❌ Validation failed: No machine selected');
      toast({
        title: 'Validation Error',
        description: 'Please select a machine using the search above',
        variant: 'destructive'
      });
      return false;
    }
 
    const selectedMachine = machines?.find(m => m.id === formData.machine_id);
    if (!selectedMachine) {
      console.log('❌ Validation failed: Invalid machine ID');
      toast({
        title: 'Validation Error',
        description: 'Selected machine is invalid. Please search and select a machine again.',
        variant: 'destructive'
      });
      setFormData({ ...formData, machine_id: '' });
      return false;
    }
 
    console.log('✅ Form validation passed');
    return true;
  };
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Starting job creation...');
 
    if (!validateForm()) {
      console.log('❌ Form validation failed, aborting job creation');
      return;
    }
 
    setLoading(true);
 
    try {
      console.log('💾 Creating job in database...');
 
      const jobData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        machine_id: formData.machine_id,
        priority: formData.priority,
        assigned_to: formData.assigned_to || null,
        status: 'pending'
      };
 
      console.log('📝 Job data to insert:', jobData);
 
      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select(`
          *,
          machine:machines(
            name,
            type,
            venue:venues(name, address)
          )
        `);
 
      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
 
      console.log('✅ Job created successfully:', data);
 
      if (data && data[0]) {
        console.log('📧 Attempting to send notification...');
        await sendJobNotification(data[0], data[0].machine, data[0].machine?.venue);
 
        // Upload any pending photos
        if (pendingPhotos.length > 0) {
          setUploadingPhoto(true);
          const uploadedUrls: string[] = [];
          for (const file of pendingPhotos) {
            try {
              const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
              const path = `job-photos/${data[0].id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
              const { data: uploadData, error: uploadErr } = await supabase.storage
                .from('venues')
                .upload(path, file, { cacheControl: '3600', upsert: false });
              if (!uploadErr && uploadData) {
                const { data: urlData } = supabase.storage.from('venues').getPublicUrl(uploadData.path);
                uploadedUrls.push(urlData.publicUrl);
              }
            } catch (err) {
              console.warn('Photo upload failed for one file:', err);
            }
          }
          if (uploadedUrls.length > 0) {
            await supabase.from('jobs').update({ photo_urls: uploadedUrls }).eq('id', data[0].id);
          }
          setUploadingPhoto(false);
        }
      }
 
      setFormData({ title: '', description: '', machine_id: '', priority: 'medium', assigned_to: null });
      setPendingPhotos([]);
      setShowForm(false);
      await fetchJobs();
 
      toast({
        title: 'Success',
        description: 'Job created successfully!'
      });
 
      console.log('🎉 Job creation completed successfully');
 
    } catch (error: any) {
      console.error('❌ Error during job creation:', error);
 
      let errorMessage = 'Failed to create job. Please try again.';
 
      if (error.message) {
        errorMessage += ` Error: ${error.message}`;
      }
 
      if (error.code) {
        console.error('Database error code:', error.code);
        if (error.code === '23514') {
          errorMessage = 'Database constraint error: Invalid status value. Please contact support.';
        }
      }
 
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
 
  const handleDialogClose = () => {
    setEditingJob(null);
    fetchJobs(true);
  };
 
  const handleJobSelect = (job: Job) => {
    setEditingJob(job);
  };
 
  const formatScheduledDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return dateString;
    }
  };
 
  const renderJobCard = (job: Job, isArchived = false) => {
    const priorityInfo = priorityConfig[job.priority];
    const statusInfo = getStatusConfig(job.status);
    const PriorityIcon = priorityInfo.icon;
    const scheduledDate = formatScheduledDate(job.scheduled_date);
 
    return (
      <Card key={job.id} className={`border-2 border-l-8 border-l-${job.priority === 'urgent' ? 'red' : job.priority === 'medium' ? 'yellow' : 'green'}-500 ${isArchived ? 'opacity-75' : ''}`}>
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
                {scheduledDate && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    📅 {scheduledDate}
                  </Badge>
                )}
                {isArchived && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {job.machine?.name} - {job.machine?.type}
                {job.machine?.venue?.name && ` @ ${job.machine.venue.name}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isArchived && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setEditingJob(job)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {job.status !== 'completed' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleCompleteJob(job)}
                      disabled={completingJobId === job.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {completingJobId === job.id ? (
                        'Completing...'
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Complete
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
              {isArchived && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleRestoreJob(job)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Restore
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {job.description && <p className="text-gray-700 mb-2">{job.description}</p>}
          {(job as any).photo_urls && (job as any).photo_urls.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-2">
              {(job as any).photo_urls.slice(0, 4).map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="w-14 h-14 rounded border overflow-hidden block bg-gray-50 hover:opacity-80 transition-opacity shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
              {(job as any).photo_urls.length > 4 && (
                <div className="w-14 h-14 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium">
                  +{(job as any).photo_urls.length - 4}
                </div>
              )}
            </div>
          )}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Created: {new Date(job.created_at).toLocaleDateString()}</p>
            {job.completed_at && (
              <p>Completed: {new Date(job.completed_at).toLocaleDateString()}</p>
            )}
            {job.completed_by && (
              <p>Completed by: {job.completed_by}</p>
            )}
            {job.assigned_to && (() => {
              const staff = staffMembers.find(s => s.id === job.assigned_to);
              const name = staff ? (staff.full_name || staff.username || 'Unknown') : job.assigned_to;
              return (
                <p className="flex items-center gap-1 font-medium text-blue-700">
                  <User className="h-3 w-3" />
                  Assigned: {name}
                </p>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    );
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
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  onMachineSelect={(machineId) => {
                    console.log('🔧 Machine selected via search:', machineId);
                    setFormData({ ...formData, machine_id: machineId });
                  }}
                  selectedMachineId={formData.machine_id}
                  label="Search by Serial Number, Name, or Barcode"
                  required
                />
              </div>
 
              <div>
                <Label>Priority Level</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'urgent') => setFormData({ ...formData, priority: value })}
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
 
              {/* Assign To */}
              <div>
                <Label className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-500" />
                  Assign To
                </Label>
                <Select
                  value={formData.assigned_to || 'unassigned'}
                  onValueChange={v => setFormData({ ...formData, assigned_to: v === 'unassigned' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffMembers.map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name || staff.username}
                        {staff.role && <span className="text-gray-400 ml-1 text-xs">· {staff.role}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
 
              {/* Attach Photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-blue-500" />
                    Attach Photos (optional)
                  </Label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setPendingPhotos(prev => [...prev, ...files]);
                        e.target.value = '';
                      }}
                    />
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border rounded-md bg-white hover:bg-gray-50 text-gray-600 cursor-pointer">
                      <Camera className="h-3 w-3" />Add
                    </span>
                  </label>
                </div>
                {pendingPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {pendingPhotos.map((file, i) => (
                      <div key={i} className="relative group rounded overflow-hidden border aspect-square bg-gray-50">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPendingPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
 
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={loading || uploadingPhoto || !formData.machine_id}
                >
                  {loading || uploadingPhoto ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{uploadingPhoto ? 'Uploading photos...' : 'Creating...'}</>
                  ) : 'Create Job'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ title: '', description: '', machine_id: '', priority: 'medium', assigned_to: null });
                    setPendingPhotos([]);
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
 
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Active Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archived ({archivedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Job History
          </TabsTrigger>
        </TabsList>
 
        <TabsContent value="list" className="space-y-4">
          {jobs.map((job) => renderJobCard(job, false))}
 
          {jobs.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-gray-500">No active jobs found. Click "Add New Job" to create one.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
 
        <TabsContent value="calendar">
          <JobsCalendar onJobSelect={handleJobSelect} />
        </TabsContent>
 
        <TabsContent value="archived" className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-purple-800 mb-2">📦 Archived Jobs</h3>
            <p className="text-sm text-purple-700">
              Completed jobs are automatically archived to maintain job history while keeping the active jobs list clean. 
              You can restore jobs if needed.
            </p>
          </div>
 
          {archivedJobs.map((job) => renderJobCard(job, true))}
 
          {archivedJobs.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <Archive className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No archived jobs found.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
 
        <TabsContent value="history" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">📊 Job History Analytics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{jobs.length}</div>
                <div className="text-blue-700">Active Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{archivedJobs.filter(j => j.status === 'completed').length}</div>
                <div className="text-green-700">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{jobs.filter(j => j.priority === 'urgent').length}</div>
                <div className="text-red-700">Urgent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{archivedJobs.length}</div>
                <div className="text-purple-700">Total Archived</div>
              </div>
            </div>
          </div>
 
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by machine name, venue, job title or description…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>
 
          {/* Last 6 months combined list */}
          {(() => {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const q = historySearch.toLowerCase();
            const allJobs = [...jobs, ...archivedJobs]
              .filter(job => new Date(job.created_at) >= sixMonthsAgo)
              .filter(job => {
                if (!q) return true;
                return (
                  job.title?.toLowerCase().includes(q) ||
                  job.description?.toLowerCase().includes(q) ||
                  job.machine?.name?.toLowerCase().includes(q) ||
                  job.machine?.venue?.name?.toLowerCase().includes(q)
                );
              })
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
 
            if (allJobs.length === 0) {
              return (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-gray-500">
                      {q ? 'No jobs match your search.' : 'No jobs in the last 6 months.'}
                    </p>
                  </CardContent>
                </Card>
              );
            }
            return (
              <>
                <p className="text-sm text-gray-500">
                  Showing {allJobs.length} job{allJobs.length !== 1 ? 's' : ''} from the last 6 months
                  {q && ` matching "${historySearch}"`}
                </p>
                {allJobs.map((job) => renderJobCard(job, !!job.archived))}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>
 
      <JobEditDialog
        job={editingJob}
        open={!!editingJob}
        onClose={handleDialogClose}
        onUpdate={() => fetchJobs(true)}
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