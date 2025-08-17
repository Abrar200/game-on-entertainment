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
      console.log('🔧 Scheduling service for machine:', machineName);
      console.log('📅 Selected date:', date);

      const jobData = {
        machine_id: machineId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: 'pending', // Use consistent lowercase status
        scheduled_date: date.toISOString(), // Add the scheduled date
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Inserting job data:', jobData);

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select(`
          *,
          machine:machines(
            name,
            type,
            venue:venues(name, address)
          )
        `);

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Service job created successfully:', data);
      
      // Send email notification for the service
      if (data && data[0]) {
        try {
          console.log('📧 Sending service notification email...');
          const { error: emailError } = await supabase.functions.invoke('send-job-email', {
            body: { 
              job: data[0], 
              machine: data[0].machine, 
              venue: data[0].machine?.venue,
              isService: true,
              scheduledDate: date
            }
          });

          if (emailError) {
            console.error('❌ Email notification error:', emailError);
            // Don't fail the job creation if email fails
          } else {
            console.log('✅ Service notification email sent');
          }
        } catch (emailError) {
          console.error('❌ Failed to send service notification:', emailError);
        }
      }

      toast({ 
        title: 'Success', 
        description: `Service scheduled for ${format(date, 'PPP')}!` 
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium'
      });
      setDate(undefined);
      
      // Close dialog and trigger refresh
      onClose();
      if (onServiceScheduled) {
        onServiceScheduled();
      }
    } catch (error: any) {
      console.error('❌ Error scheduling service:', error);
      
      let errorMessage = 'Failed to schedule service';
      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      
      // Handle specific database errors
      if (error.code === '42703') {
        errorMessage = 'Database schema error: scheduled_date column is missing. Please add it to your jobs table.';
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

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      title: '',
      description: '',
      priority: 'medium'
    });
    setDate(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>
          
          <div>
            <Label>Scheduled Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                  disabled={loading}
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
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Disable past dates
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label>Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value: any) => setFormData({...formData, priority: value})}
              disabled={loading}
            >
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
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.title.trim() || !date}
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