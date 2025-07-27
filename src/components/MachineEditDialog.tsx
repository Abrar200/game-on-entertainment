import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/lib/supabase';

interface MachineEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  machine?: any;
}

export const MachineEditDialog: React.FC<MachineEditDialogProps> = ({
  isOpen,
  onClose,
  machine
}) => {
  const { venues, refreshData, addMachine } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    venue_id: '',
    status: 'active',
    image_url: '',
    serial_number: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (machine) {
        setFormData({
          name: machine.name || '',
          type: machine.type || '',
          venue_id: machine.venue_id || 'none',
          status: machine.status || 'active',
          image_url: machine.image_url || '',
          serial_number: machine.serial_number || ''
        });
      } else {
        setFormData({
          name: '',
          type: '',
          venue_id: 'none',
          status: 'active',
          image_url: '',
          serial_number: ''
        });
      }
    }
  }, [isOpen, machine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Machine name is required', variant: 'destructive' });
      return;
    }
    
    if (!formData.type.trim()) {
      toast({ title: 'Error', description: 'Machine type is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const machineData = {
        name: formData.name.trim(),
        type: formData.type.trim(),
        venue_id: formData.venue_id === 'none' ? null : formData.venue_id,
        status: formData.status,
        image_url: formData.image_url || null,
        serial_number: formData.serial_number.trim() || null
      };
      
      if (machine) {
        const { error } = await supabase
          .from('machines')
          .update(machineData)
          .eq('id', machine.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Machine updated successfully!' });
      } else {
        await addMachine(machineData);
        toast({ title: 'Success', description: 'Machine added successfully!' });
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving machine:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to save machine', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{machine ? 'Edit Machine' : 'Add Machine'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Machine Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter machine name"
              required
            />
          </div>
          <div>
            <Label htmlFor="type">Machine Type *</Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              placeholder="e.g., Claw Machine, Arcade Game"
              required
            />
          </div>
          <div>
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
              placeholder="Enter serial number"
            />
          </div>
          <div>
            <Label htmlFor="venue">Venue</Label>
            <Select value={formData.venue_id} onValueChange={(value) => setFormData({...formData, venue_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select a venue (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No venue</SelectItem>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ImageUpload
            folder="machines"
            currentImage={formData.image_url}
            onImageUploaded={(url) => setFormData({...formData, image_url: url})}
          />
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : (machine ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MachineEditDialog;