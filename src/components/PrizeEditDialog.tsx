import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import ImageUpload from '@/components/ImageUpload';

interface PrizeEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prizeId: string;
}

const PrizeEditDialog: React.FC<PrizeEditDialogProps> = ({ isOpen, onClose, prizeId }) => {
  const { prizes, updatePrize } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    stock_quantity: '',
    image_url: ''
  });

  const prize = prizes.find(p => p.id === prizeId);

  useEffect(() => {
    if (prize) {
      setFormData({
        name: prize.name || '',
        cost: (prize.cost || 0).toString(),
        stock_quantity: (prize.stock_quantity || 0).toString(),
        image_url: prize.image_url || ''
      });
    }
  }, [prize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePrize(prizeId, {
        name: formData.name,
        cost: Number(formData.cost),
        stock_quantity: Number(formData.stock_quantity),
        image_url: formData.image_url
      });
      onClose();
    } catch (error) {
      console.error('Error updating prize:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Prize</DialogTitle>
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
            <Label htmlFor="stock">Stock Quantity</Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
              placeholder="Enter stock quantity"
              required
            />
          </div>
          <ImageUpload
            folder="prizes"
            currentImage={formData.image_url}
            onImageUploaded={(url) => setFormData({...formData, image_url: url})}
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Update Prize
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

export default PrizeEditDialog;