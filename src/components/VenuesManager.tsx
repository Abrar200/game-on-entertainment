import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Trash2, Edit } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import ImageUpload from '@/components/ImageUpload';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import VenueEditDialog from '@/components/VenueEditDialog';
import { createImageWithFallback } from '@/lib/imageUtils';

const VenuesManager: React.FC = () => {
  const { venues, addVenue, deleteVenue } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, venueId: string, venueName: string }>({
    open: false, venueId: '', venueName: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_person: '',
    phone: '',
    commission_percentage: 30,
    image_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addVenue(formData);
      setFormData({
        name: '',
        address: '',
        contact_person: '',
        phone: '',
        commission_percentage: 30,
        image_url: ''
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding venue:', error);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({ open: true, venueId: id, venueName: name });
  };

  const handleDeleteConfirm = async () => {
    await deleteVenue(deleteDialog.venueId);
  };

  const openEditDialog = (venueId: string) => {
    setSelectedVenue(venueId);
    setIsEditDialogOpen(true);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Venues Management</h2>
          <p className="text-gray-600 mt-2">Manage arcade and entertainment venues</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New Venue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Venue</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Venue Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contact">Contact Person</Label>
                <Input
                  id="contact"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="commission">Commission %</Label>
                <Input
                  id="commission"
                  type="number"
                  value={formData.commission_percentage}
                  onChange={(e) => setFormData({ ...formData, commission_percentage: Number(e.target.value) })}
                  min="0"
                  max="100"
                />
              </div>
              <ImageUpload
                folder="venues"
                currentImage={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              />
              <Button type="submit" className="w-full">
                Add Venue
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <Card key={venue.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{venue.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(venue.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteClick(venue.id, venue.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {venue.image_url && (
                <div className="mb-4">
                  <img
                    {...createImageWithFallback(venue.image_url, venue.name, 'venue')}
                    className="w-full h-32 object-cover rounded"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
              {venue.address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                  <p className="text-sm text-gray-600">{venue.address}</p>
                </div>
              )}

              <div className="space-y-2">
                {venue.contact_person && (
                  <p className="text-sm"><strong>Contact:</strong> {venue.contact_person}</p>
                )}
                {venue.phone && (
                  <p className="text-sm"><strong>Phone:</strong> {venue.phone}</p>
                )}
                <p className="text-sm"><strong>Commission:</strong> {venue.commission_percentage}%</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {venues.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No venues added yet. Click "Add New Venue" to get started.</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, venueId: '', venueName: '' })}
        onConfirm={handleDeleteConfirm}
        itemType="Venue"
        itemName={deleteDialog.venueName}
      />

      <VenueEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        venueId={selectedVenue}
      />
    </div>
  );
};

export default VenuesManager;