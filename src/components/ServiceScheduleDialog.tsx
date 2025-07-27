import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ServiceScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  machineId: string;
  machineName: string;
  onServiceScheduled?: () => void;
}

export const ServiceScheduleDialog: React.FC<ServiceScheduleDialogProps> = ({
  isOpen,
  onClose,
  machineId,
  machineName,
  onServiceScheduled
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'urgent'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Service title is required', variant: 'destructive' });
      return;
    }
    
    if (!date) {
      toast({ title: 'Error', description: 'Please select a service date', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const jobData = {
        machine_id: machineId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Inserting job data:', jobData);

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Job created successfully:', data);
      toast({ title: 'Success', description: 'Service scheduled successfully!' });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium'
      });
      setDate(undefined);
      
      // Close dialog and navigate back to machine screen
      onClose();
      if (onServiceScheduled) {
        onServiceScheduled();
      }
    } catch (error: any) {
      console.error('Error scheduling service:', error);
      const errorMessage = error?.message || 'Failed to schedule service';
      toast({ 
        title: 'Error', 
        description: `Failed to schedule service: ${errorMessage}`, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Service - {machineName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Service Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Monthly Maintenance, Repair Issue"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the service needed..."
              rows={3}
            />
          </div>
          
          <div>
            <Label>Scheduled Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(value: any) => setFormData({...formData, priority: value})}>
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
          
          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Scheduling...' : 'Schedule Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceScheduleDialog;