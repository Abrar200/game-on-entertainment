import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Gift, Package, Trash2, Edit } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import ImageUpload from '@/components/ImageUpload';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import PrizeEditDialog from '@/components/PrizeEditDialog';

const PrizesManager: React.FC = () => {
  const { prizes, addPrize, deletePrize, updatePrizeStock } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, prizeId: string, prizeName: string}>({
    open: false, prizeId: '', prizeName: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    stock_quantity: '',
    image_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addPrize({
        name: formData.name,
        cost: Number(formData.cost),
        stock_quantity: Number(formData.stock_quantity),
        image_url: formData.image_url
      });
      setFormData({ name: '', cost: '', stock_quantity: '', image_url: '' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding prize:', error);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({open: true, prizeId: id, prizeName: name});
  };

  const handleDeleteConfirm = async () => {
    await deletePrize(deleteDialog.prizeId);
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPrize && stockQuantity) {
      await updatePrizeStock(selectedPrize, Number(stockQuantity));
      setIsStockDialogOpen(false);
      setSelectedPrize('');
      setStockQuantity('');
    }
  };

  const openStockDialog = (prizeId: string, currentStock: number) => {
    setSelectedPrize(prizeId);
    setStockQuantity(currentStock.toString());
    setIsStockDialogOpen(true);
  };

  const openEditDialog = (prizeId: string) => {
    setSelectedPrize(prizeId);
    setIsEditDialogOpen(true);
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
          <h2 className="text-3xl font-bold text-gray-900">Prizes Management</h2>
          <p className="text-gray-600 mt-2">Manage prize inventory and stock levels</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New Prize
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Prize</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Prize Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter prize name"
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
                <Label htmlFor="stock">Initial Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  placeholder="Enter initial stock"
                  required
                />
              </div>
              <ImageUpload
                folder="prizes"
                currentImage={formData.image_url}
                onImageUploaded={(url) => setFormData({...formData, image_url: url})}
              />
              <Button type="submit" className="w-full">
                Add Prize
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prizes.map((prize) => {
          const prizeName = prize.name || 'Unknown Prize';
          const prizeCost = prize.cost || 0;
          const prizeStock = prize.stock_quantity || 0;
          
          return (
            <Card key={prize.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{prizeName}</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openEditDialog(prize.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDeleteClick(prize.id, prizeName)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {prize.image_url && (
                  <div className="mb-4">
                    <img 
                      src={getImageUrl(prize.image_url)} 
                      alt={prizeName}
                      className="w-full h-32 object-cover rounded"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Cost</p>
                    <p className="font-semibold">${prizeCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stock</p>
                    <div className="flex items-center space-x-1">
                      <Package className="h-4 w-4" />
                      <span className="font-semibold">{prizeStock}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openStockDialog(prize.id, prizeStock)}
                  >
                    Update Stock
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {prizes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No prizes added yet. Click "Add New Prize" to get started.</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({open: false, prizeId: '', prizeName: ''})}
        onConfirm={handleDeleteConfirm}
        itemType="Prize"
        itemName={deleteDialog.prizeName}
      />

      <PrizeEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        prizeId={selectedPrize}
      />

      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockUpdate} className="space-y-4">
            <div>
              <Label htmlFor="stockQty">Stock Quantity</Label>
              <Input
                id="stockQty"
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Enter stock quantity"
                min="0"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Update Stock
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrizesManager;