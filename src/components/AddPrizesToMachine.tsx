import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Search, X, Gift } from 'lucide-react';

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
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPrizes, setFilteredPrizes] = useState(prizes);

  // Filter prizes based on search term and stock availability
  useEffect(() => {
    const filtered = prizes.filter(prize => {
      const hasStock = prize.stock_quantity > 0;
      const matchesSearch = searchTerm === '' || 
        prize.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prize.barcode && prize.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return hasStock && matchesSearch;
    });
    setFilteredPrizes(filtered);
  }, [prizes, searchTerm]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPrizeId('');
      setQuantity('');
      setNotes('');
      setSearchTerm('');
    }
  }, [isOpen]);

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
      // Add to machine stock with notes
      await addMachineStock({
        machine_id: machineId,
        prize_id: selectedPrizeId,
        quantity: qty,
        notes: notes.trim() || null
      });

      // Update prize stock
      await updatePrizeStock(selectedPrizeId, selectedPrize.stock_quantity - qty);

      toast({ 
        title: 'Success', 
        description: `Added ${qty} ${selectedPrize.name} to ${machineName}${notes ? ' with notes' : ''}` 
      });
      
      // Reset form
      setSelectedPrizeId('');
      setQuantity('');
      setNotes('');
      setSearchTerm('');
      onClose();
    } catch (error) {
      console.error('Error adding prizes to machine:', error);
      toast({ title: 'Error', description: 'Failed to add prizes to machine', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const selectPrizeFromSearch = (prizeId: string, prizeName: string) => {
    setSelectedPrizeId(prizeId);
    setSearchTerm(prizeName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-red-800 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Add Prizes to {machineName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search Section */}
          <div>
            <Label htmlFor="search" className="text-red-700 font-medium">Search Prizes</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or barcode..."
                className="pl-10 pr-10 border-red-300 focus:border-red-500"
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={clearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {searchTerm && filteredPrizes.length > 0 && !selectedPrizeId && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-red-300 rounded-lg bg-white shadow-lg">
                {filteredPrizes.slice(0, 5).map(prize => (
                  <button
                    key={prize.id}
                    type="button"
                    className="w-full text-left p-3 hover:bg-red-50 border-b last:border-b-0 transition-colors"
                    onClick={() => selectPrizeFromSearch(prize.id, prize.name)}
                  >
                    <div className="font-medium text-gray-900">{prize.name}</div>
                    <div className="text-sm text-gray-600">
                      Stock: {prize.stock_quantity} • ${prize.cost?.toFixed(2) || '0.00'}
                    </div>
                    {prize.barcode && (
                      <div className="text-xs text-gray-500">Barcode: {prize.barcode}</div>
                    )}
                  </button>
                ))}
                {filteredPrizes.length > 5 && (
                  <div className="p-2 text-xs text-gray-500 text-center border-t">
                    {filteredPrizes.length - 5} more results...
                  </div>
                )}
              </div>
            )}
            
            {searchTerm && filteredPrizes.length === 0 && (
              <div className="mt-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                No prizes found matching "{searchTerm}" with available stock
              </div>
            )}
          </div>

          {/* Prize Selection */}
          <div>
            <Label htmlFor="prize" className="text-red-700 font-medium">
              Select Prize {selectedPrizeId && '✓'}
            </Label>
            <Select 
              value={selectedPrizeId} 
              onValueChange={(value) => {
                setSelectedPrizeId(value);
                const prize = prizes.find(p => p.id === value);
                if (prize) {
                  setSearchTerm(prize.name);
                }
              }}
            >
              <SelectTrigger className="border-red-300">
                <SelectValue placeholder="Choose a prize" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filteredPrizes.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No prizes with stock available
                  </div>
                ) : (
                  filteredPrizes.map((prize) => (
                    <SelectItem key={prize.id} value={prize.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{prize.name}</span>
                        <span className="text-xs text-gray-500">
                          Stock: {prize.stock_quantity} • ${prize.cost?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Prize Info */}
          {selectedPrizeId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              {(() => {
                const prize = prizes.find(p => p.id === selectedPrizeId);
                return prize ? (
                  <div>
                    <div className="font-medium text-blue-800">{prize.name}</div>
                    <div className="text-sm text-blue-600">
                      Available Stock: {prize.stock_quantity} • Cost: ${prize.cost?.toFixed(2) || '0.00'}
                    </div>
                    {prize.barcode && (
                      <div className="text-xs text-blue-500 font-mono">
                        Barcode: {prize.barcode}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Quantity */}
          <div>
            <Label htmlFor="quantity" className="text-red-700 font-medium">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              className="border-red-300 focus:border-red-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-red-700 font-medium">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this prize stock (machine specifics, special instructions, etc.)"
              className="border-red-300 focus:border-red-500"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              These notes will be saved with the stock record for future reference
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
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
              disabled={isSubmitting || !selectedPrizeId || !quantity || filteredPrizes.length === 0}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Adding...' : 'Add Prizes'}
            </Button>
          </div>
        </form>

        {/* No Stock Warning */}
        {prizes.filter(p => p.stock_quantity > 0).length === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-medium">
              ⚠️ No prizes have stock available
            </p>
            <p className="text-yellow-700 text-xs mt-1">
              Add stock to prizes before assigning them to machines
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddPrizesToMachine;