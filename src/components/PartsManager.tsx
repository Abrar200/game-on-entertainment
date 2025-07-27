import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wrench, Trash2 } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

const PartsManager: React.FC = () => {
  const [parts, setParts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, partId: string, partName: string}>({
    open: false, partId: '', partName: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    stock: '',
    image_url: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPart = {
      id: Date.now().toString(),
      name: formData.name,
      cost: Number(formData.cost),
      stock: Number(formData.stock),
      image_url: formData.image_url
    };
    setParts([...parts, newPart]);
    setFormData({ name: '', cost: '', stock: '', image_url: '' });
    setIsDialogOpen(false);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({open: true, partId: id, partName: name});
  };

  const handleDeleteConfirm = () => {
    setParts(parts.filter(part => part.id !== deleteDialog.partId));
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://bwmrnlbjjakqnmqvxiso.supabase.co/storage/v1/object/public/images/${url}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Parts Management</h2>
          <p className="text-gray-600 mt-2">Manage machine parts and maintenance inventory</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New Part
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Part</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Part Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter part name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  placeholder="Enter cost"
                  required
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  placeholder="Enter stock quantity"
                  required
                />
              </div>
              <ImageUpload
                folder="parts"
                currentImage={formData.image_url}
                onImageUploaded={(url) => setFormData({...formData, image_url: url})}
              />
              <Button type="submit" className="w-full">
                Add Part
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parts.map((part) => (
          <Card key={part.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{part.name}</CardTitle>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => handleDeleteClick(part.id, part.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {part.image_url && (
                <div className="mb-4">
                  <img 
                    src={getImageUrl(part.image_url)} 
                    alt={part.name}
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              )}
              <p><strong>Cost:</strong> ${part.cost.toFixed(2)}</p>
              <p><strong>Stock:</strong> {part.stock}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {parts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No parts added yet. Click "Add New Part" to get started.</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({open: false, partId: '', partName: ''})}
        onConfirm={handleDeleteConfirm}
        itemType="Part"
        itemName={deleteDialog.partName}
      />
    </div>
  );
};

export default PartsManager;