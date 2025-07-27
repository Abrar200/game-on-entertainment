import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/contexts/AppContext';
import ImageUpload from '@/components/ImageUpload';

interface VenueEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  venueId: string;
}

const VenueEditDialog: React.FC<VenueEditDialogProps> = ({ isOpen, onClose, venueId }) => {
  const { venues, updateVenue } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_person: '',
    phone: '',
    commission_percentage: 30,
    image_url: ''
  });

  const venue = venues.find(v => v.id === venueId);

  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || '',
        address: venue.address || '',
        contact_person: venue.contact_person || '',
        phone: venue.phone || '',
        commission_percentage: venue.commission_percentage || 30,
        image_url: venue.image_url || ''
      });
    }
  }, [venue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateVenue(venueId, formData);
      onClose();
    } catch (error) {
      console.error('Error updating venue:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Venue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Venue Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="contact">Contact Person</Label>
            <Input
              id="contact"
              value={formData.contact_person}
              onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="commission">Commission %</Label>
            <Input
              id="commission"
              type="number"
              value={formData.commission_percentage}
              onChange={(e) => setFormData({...formData, commission_percentage: Number(e.target.value)})}
              min="0"
              max="100"
            />
          </div>
          <ImageUpload
            folder="venues"
            currentImage={formData.image_url}
            onImageUploaded={(url) => setFormData({...formData, image_url: url})}
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Update Venue
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VenueEditDialog;