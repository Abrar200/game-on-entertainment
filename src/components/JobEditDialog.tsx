import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'urgent';
  status: string; // Changed to string to match JobsManager
  progress_updates?: string[];
  machine_id?: string;
  created_at?: string;
  machine?: {
    name: string;
    type: string;
    venue?: { name: string };
  };
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
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    priority: job?.priority || 'medium',
    status: job?.status || 'open'
  });
  const [newUpdate, setNewUpdate] = useState('');
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  // Add local state to track progress updates for immediate display
  const [localProgressUpdates, setLocalProgressUpdates] = useState<string[]>([]);

  // Function to normalize status for display and database operations
  const normalizeStatus = (status: string): string => {
    return status.toLowerCase();
  };

  // Function to get status display label
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

  React.useEffect(() => {
    if (job) {
      setFormData({
        title: job.title,
        description: job.description,
        priority: job.priority,
        status: normalizeStatus(job.status)
      });
      // Update local progress updates when job changes
      setLocalProgressUpdates(job.progress_updates || []);
    }
  }, [job]);

  const handleSave = async () => {
    if (!job) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: formData.status // This will be the normalized lowercase version
        })
        .eq('id', job.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Job updated successfully!' });
      onUpdate(); // This will refresh the data
      onClose();  // This will close the dialog
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update job', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!job || !newUpdate.trim()) return;

    setLoading(true);
    try {
      const updates = localProgressUpdates; // Use local state instead of job.progress_updates
      const timestamp = new Date().toISOString();
      const updateEntry = `${timestamp}: ${newUpdate.trim()}`;
      const newUpdatesArray = [...updates, updateEntry];

      console.log('📝 Adding progress update:', updateEntry);
      console.log('🔍 Current updates:', updates);
      console.log('📋 Job ID:', job.id);

      const { data, error } = await supabase
        .from('jobs')
        .update({ progress_updates: newUpdatesArray })
        .eq('id', job.id)
        .select(); // Add select to see what was updated

      if (error) {
        console.error('❌ Progress update error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }

      console.log('✅ Progress update successful:', data);

      // Update local state immediately to show the new update
      setLocalProgressUpdates(newUpdatesArray);

      toast({ title: 'Success', description: 'Progress update added!' });
      setNewUpdate('');
      setShowUpdateForm(false);

      // Still call onUpdate to refresh the parent list, but we don't need to wait for it
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
                // Reverse the array to show latest updates first (most recent at top)
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