import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';

interface AddPrizesToMachineProps {
  machineId: string;
  machineName: string;
  isOpen: boolean;
  onClose: () => void;
}

const AddPrizesToMachine: React.FC<AddPrizesToMachineProps> = ({
  machineId,
  machineName,
  isOpen,
  onClose
}) => {
  const { prizes, addMachineStock, updatePrizeStock } = useAppContext();
  const { toast } = useToast();
  const [selectedPrizeId, setSelectedPrizeId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const availablePrizes = prizes.filter(prize => 
    prize.stock_quantity > 0 && 
    prize.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPrizeId || !quantity) {
      toast({ title: 'Error', description: 'Please select a prize and enter quantity', variant: 'destructive' });
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast({ title: 'Error', description: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    const selectedPrize = prizes.find(p => p.id === selectedPrizeId);
    if (!selectedPrize || selectedPrize.stock_quantity < qty) {
      toast({ title: 'Error', description: 'Not enough stock available', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addMachineStock({
        machine_id: machineId,
        prize_id: selectedPrizeId,
        quantity: qty
      });

      await updatePrizeStock(selectedPrizeId, selectedPrize.stock_quantity - qty);

      toast({ title: 'Success', description: `Added ${qty} ${selectedPrize.name} to ${machineName}` });
      setSelectedPrizeId('');
      setQuantity('');
      setSearchTerm('');
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add prizes to machine', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-800">Add Prizes to {machineName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="search" className="text-red-700">Search Prizes</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search prizes..."
                className="pl-10 border-red-300 focus:border-red-500"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="prize" className="text-red-700">Select Prize</Label>
            <Select value={selectedPrizeId} onValueChange={setSelectedPrizeId}>
              <SelectTrigger className="border-red-300">
                <SelectValue placeholder="Choose a prize" />
              </SelectTrigger>
              <SelectContent>
                {availablePrizes.map((prize) => (
                  <SelectItem key={prize.id} value={prize.id}>
                    {prize.name} (Stock: {prize.stock_quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity" className="text-red-700">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              className="border-red-300 focus:border-red-500"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || availablePrizes.length === 0}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Adding...' : 'Add Prizes'}
            </Button>
          </div>
        </form>
        {availablePrizes.length === 0 && searchTerm && (
          <p className="text-red-600 text-sm text-center">No prizes found matching "{searchTerm}"</p>
        )}
        {availablePrizes.length === 0 && !searchTerm && (
          <p className="text-red-600 text-sm text-center">No prizes with stock available</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddPrizesToMachine;