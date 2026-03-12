import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Clock, CalendarIcon, X, User, Camera, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'urgent';
  status: string;
  scheduled_date?: string;
  progress_updates?: string[];
  photo_urls?: string[];
  assigned_to?: string | null;
  created_at?: string;
  machine?: {
    name: string;
    type: string;
    venue?: { name: string };
  };
}

interface StaffMember {
  id: string;
  full_name?: string;
  username?: string;
  role?: string;
}

interface JobEditDialogProps {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const JobEditDialog: React.FC<JobEditDialogProps> = ({ job, open, onClose, onUpdate }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    priority: job?.priority || 'medium',
    status: job?.status || 'open',
    scheduled_date: job?.scheduled_date || null,
    assigned_to: job?.assigned_to || null as string | null
  });
  const [newUpdate, setNewUpdate] = useState('');
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [localProgressUpdates, setLocalProgressUpdates] = useState<string[]>([]);
  const [localPhotoUrls, setLocalPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const normalizeStatus = (status: string): string => {
    return status.toLowerCase();
  };

  const getStatusLabel = (status: string): string => {
    const normalized = normalizeStatus(status);
    const labels = {
      'open': 'Open',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'pending': 'Pending'
    };
    return labels[normalized] || status;
  };

  // Fetch staff members for the assign dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, username, role')
          .eq('is_active', true)
          .order('full_name', { ascending: true });
        if (!error && data) setStaffMembers(data);
      } catch (err) {
        console.warn('Could not fetch staff members:', err);
      }
    };
    fetchStaff();
  }, []);

  React.useEffect(() => {
    if (job) {
      setFormData({
        title: job.title,
        description: job.description,
        priority: job.priority,
        status: normalizeStatus(job.status),
        scheduled_date: job.scheduled_date || null,
        assigned_to: (job as any).assigned_to || null
      });
      setLocalProgressUpdates(job.progress_updates || []);
      setLocalPhotoUrls((job as any).photo_urls || []);
    }
  }, [job]);

  const handleSave = async () => {
    if (!job) return;

    setLoading(true);
    try {
      const updateData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        scheduled_date: formData.scheduled_date,
        assigned_to: formData.assigned_to || null
      };

      console.log('💾 Updating job with data:', updateData);

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', job.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Job updated successfully!' });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('❌ Error updating job:', error);
      toast({ title: 'Error', description: 'Failed to update job', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!job || !newUpdate.trim()) return;

    setLoading(true);
    try {
      const updates = localProgressUpdates;
      const timestamp = new Date().toISOString();
      const updateEntry = `${timestamp}: ${newUpdate.trim()}`;
      const newUpdatesArray = [...updates, updateEntry];

      console.log('📝 Adding progress update:', updateEntry);

      const { data, error } = await supabase
        .from('jobs')
        .update({ progress_updates: newUpdatesArray })
        .eq('id', job.id)
        .select();

      if (error) {
        console.error('❌ Progress update error:', error);
        throw error;
      }

      console.log('✅ Progress update successful:', data);
      setLocalProgressUpdates(newUpdatesArray);
      toast({ title: 'Success', description: 'Progress update added!' });
      setNewUpdate('');
      setShowUpdateForm(false);
      onUpdate();
    } catch (error: any) {
      console.error('❌ Failed to add update:', error);

      let errorMessage = 'Failed to add update';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error.code === 'PGRST204') {
        errorMessage = 'Database error: progress_updates column does not exist. Please add it to your jobs table.';
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!job || !e.target.files || e.target.files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `job-photos/${job.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from('venues')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('venues').getPublicUrl(data.path);
      const newUrls = [...localPhotoUrls, urlData.publicUrl];
      await supabase.from('jobs').update({ photo_urls: newUrls }).eq('id', job.id);
      setLocalPhotoUrls(newUrls);
      toast({ title: 'Photo uploaded!' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (url: string) => {
    if (!job) return;
    const newUrls = localPhotoUrls.filter(u => u !== url);
    await supabase.from('jobs').update({ photo_urls: newUrls }).eq('id', job.id);
    setLocalPhotoUrls(newUrls);
    onUpdate();
  };

  const handleScheduledDateChange = (date: Date | undefined) => {
    setFormData({
      ...formData,
      scheduled_date: date ? date.toISOString() : null
    });
  };

  const clearScheduledDate = () => {
    setFormData({
      ...formData,
      scheduled_date: null
    });
  };

  const getSelectedDate = (): Date | undefined => {
    if (!formData.scheduled_date) return undefined;
    try {
      return parseISO(formData.scheduled_date);
    } catch (error) {
      console.error('Error parsing scheduled date:', formData.scheduled_date, error);
      return undefined;
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={loading}
            />
          </div>

          <div>
            <Label>Scheduled Date</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !getSelectedDate() && 'text-muted-foreground'
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {getSelectedDate() ? format(getSelectedDate()!, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={getSelectedDate()}
                    onSelect={handleScheduledDateChange}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
              {getSelectedDate() && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearScheduledDate}
                  disabled={loading}
                  title="Clear scheduled date"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {getSelectedDate() && (
              <p className="text-sm text-blue-600 mt-1">
                Scheduled for: {format(getSelectedDate()!, 'EEEE, MMMM d, yyyy')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="urgent">Urgent Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value: string) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assign to staff member */}
          <div>
            <Label className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Assign To
            </Label>
            <Select
              value={formData.assigned_to || 'unassigned'}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value === 'unassigned' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffMembers.map(staff => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name || staff.username}
                    {staff.role && (
                      <span className="text-gray-400 ml-1 text-xs">· {staff.role}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Progress Updates</h3>
              <Button
                size="sm"
                onClick={() => setShowUpdateForm(true)}
                disabled={showUpdateForm}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Update
              </Button>
            </div>

            {showUpdateForm && (
              <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded">
                <Textarea
                  placeholder="Enter progress update..."
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddUpdate} disabled={loading || !newUpdate.trim()}>
                    Add Update
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowUpdateForm(false); setNewUpdate(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {localProgressUpdates && localProgressUpdates.length > 0 ? (
                [...localProgressUpdates].reverse().map((update, index) => {
                  const [timestamp, ...messageParts] = update.split(': ');
                  const message = messageParts.join(': ');
                  return (
                    <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                        <Clock className="h-3 w-3" />
                        {new Date(timestamp).toLocaleString()}
                      </div>
                      <p>{message}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-sm">No progress updates yet</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Job Photos */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-blue-500" />
                Job Photos
                {localPhotoUrls.length > 0 && (
                  <span className="text-xs text-gray-400 font-normal">({localPhotoUrls.length})</span>
                )}
              </h3>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  uploadingPhoto
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                }`}>
                  {uploadingPhoto ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading...</>
                  ) : (
                    <><Camera className="h-3.5 w-3.5" />Add Photo</>
                  )}
                </span>
              </label>
            </div>

            {localPhotoUrls.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4 border border-dashed rounded-lg">
                No photos attached yet
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {localPhotoUrls.map((url, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border bg-gray-50 aspect-square">
                    <img src={url} alt={`Job photo ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1.5">
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors">
                          <Camera className="h-3.5 w-3.5" />
                        </a>
                        <button onClick={() => handleDeletePhoto(url)}
                          className="p-1.5 bg-white rounded-full text-gray-700 hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobEditDialog;