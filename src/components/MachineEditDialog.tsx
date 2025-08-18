import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Package, Wrench } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/lib/supabase';

interface MachineEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  machine?: any;
}

interface MachineStock {
  id: string;
  machine_id: string;
  prize_id: string;
  quantity: number;
  notes?: string;
  prizes?: any; // This will contain the prize data
}

interface MachinePart {
  id: string;
  machine_id: string;
  part_id: string;
  quantity: number;
  notes?: string;
  parts?: any; // This will contain the part data
}

export const MachineEditDialog: React.FC<MachineEditDialogProps> = ({
  isOpen,
  onClose,
  machine
}) => {
  const { venues, prizes, parts, refreshData, addMachine } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [machineStock, setMachineStock] = useState<MachineStock[]>([]);
  const [machineParts, setMachineParts] = useState<MachinePart[]>([]);
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
        fetchMachineStock();
        fetchMachineParts();
      } else {
        setFormData({
          name: '',
          type: '',
          venue_id: 'none',
          status: 'active',
          image_url: '',
          serial_number: ''
        });
        setMachineStock([]);
        setMachineParts([]);
      }
    }
  }, [isOpen, machine]);

  // Function to fetch machine stock
  const fetchMachineStock = async () => {
    if (!machine?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('machine_stock')
        .select(`
          id,
          machine_id,
          prize_id,
          quantity,
          notes,
          prizes!inner(
            id,
            name,
            cost,
            stock_quantity,
            image_url,
            barcode
          )
        `)
        .eq('machine_id', machine.id);

      if (error) {
        console.error('❌ Error fetching machine stock:', error);
        throw error;
      }
      setMachineStock(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load machine stock',
        variant: 'destructive'
      });
    }
  };

  // Function to fetch machine parts
  const fetchMachineParts = async () => {
    if (!machine?.id) return;

    try {
      const { data, error } = await supabase
        .from('machine_parts')
        .select(`
          id,
          machine_id,
          part_id,
          quantity,
          notes,
          parts!inner(
            id,
            name,
            cost_price,
            stock_quantity,
            image_url,
            barcode
          )
        `)
        .eq('machine_id', machine.id);

      if (error) {
        console.error('❌ Error fetching machine parts:', error);
        throw error;
      }
      setMachineParts(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load machine parts',
        variant: 'destructive'
      });
    }
  };

  // Handle form submission to update or add machine
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.type.trim()) {
      toast({ title: 'Error', description: 'Machine name and type are required', variant: 'destructive' });
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

        if (error) throw new Error(`Failed to update machine: ${error.message}`);
        await refreshData();
        toast({ title: 'Success', description: 'Machine updated successfully!' });
      } else {
        await addMachine(machineData);
        toast({ title: 'Success', description: 'Machine added successfully!' });
      }
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save machine';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add prize to machine
  const addPrizeToMachine = async (prizeId: string, quantity: number, notes?: string) => {
    if (!machine?.id) return;

    try {
      const { error } = await supabase
        .from('machine_stock')
        .insert([{ machine_id: machine.id, prize_id: prizeId, quantity, notes }]);

      if (error) throw error;

      const prize = prizes.find((p) => p.id === prizeId);
      if (prize) {
        const newStock = Math.max(0, prize.stock_quantity - quantity);
        await supabase.from('prizes').update({ stock_quantity: newStock }).eq('id', prizeId);
      }

      await fetchMachineStock();
      await refreshData();
      toast({ title: 'Success', description: 'Prize added to machine!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add prize to machine', variant: 'destructive' });
    }
  };

  // Add part to machine
  const addPartToMachine = async (partId: string, quantity: number, notes?: string) => {
    if (!machine?.id) return;

    try {
      const { error } = await supabase
        .from('machine_parts')
        .insert([{ machine_id: machine.id, part_id: partId, quantity, notes }]);

      if (error) throw error;

      const part = parts.find((p) => p.id === partId);
      if (part) {
        const newStock = Math.max(0, part.stock_quantity - quantity);
        await supabase.from('parts').update({ stock_quantity: newStock }).eq('id', partId);
      }

      await fetchMachineParts();
      await refreshData();
      toast({ title: 'Success', description: 'Part added to machine!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add part to machine', variant: 'destructive' });
    }
  };

  // Remove prize from machine
  const removePrizeFromMachine = async (stockId: string) => {
    try {
      const { error } = await supabase.from('machine_stock').delete().eq('id', stockId);
      if (error) throw error;
      await fetchMachineStock();
      toast({ title: 'Success', description: 'Prize removed from machine!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove prize', variant: 'destructive' });
    }
  };

  
  // Remove part from machine
  const removePartFromMachine = async (partStockId: string) => {
    try {
      const { error } = await supabase
        .from('machine_parts')
        .delete()
        .eq('id', partStockId);
  
      if (error) throw error;
      await fetchMachineParts();
      toast({ title: 'Success', description: 'Part removed from machine!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove part from machine',
        variant: 'destructive',
      });
    }
  };
    


  const AddPrizeForm = () => {
    const [selectedPrize, setSelectedPrize] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [notes, setNotes] = useState('');
  
    const handleAddPrize = () => {
      if (selectedPrize && quantity) {
        addPrizeToMachine(selectedPrize, parseInt(quantity), notes);
        setSelectedPrize('');
        setQuantity('1');
        setNotes('');
      }
    };
  
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Add Prize to Machine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedPrize} onValueChange={setSelectedPrize}>
            <SelectTrigger>
              <SelectValue placeholder="Select a prize" />
            </SelectTrigger>
            <SelectContent>
              {prizes.filter((p) => p.stock_quantity > 0).map((prize) => (
                <SelectItem key={prize.id} value={prize.id}>
                  {prize.name} (Stock: {prize.stock_quantity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
          />
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
          />
          <Button
            onClick={handleAddPrize}
            disabled={!selectedPrize || !quantity}
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Prize
          </Button>
        </CardContent>
      </Card>
    );
  };
  

  const AddPartForm = () => {
    const [selectedPart, setSelectedPart] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [notes, setNotes] = useState('');

    const handleAddPart = () => {
        if (selectedPart && quantity) {
            addPartToMachine(selectedPart, parseInt(quantity), notes);
            setSelectedPart('');
            setQuantity('1');
            setNotes('');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm">Add Part to Machine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <Select value={selectedPart} onValueChange={setSelectedPart}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a part" />
                    </SelectTrigger>
                    <SelectContent>
                        {parts.filter((p) => p.stock_quantity > 0).map((part) => (
                            <SelectItem key={part.id} value={part.id}>
                                {part.name} (Stock: {part.stock_quantity})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Quantity"
                />
                <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                />
                <Button 
                    onClick={handleAddPart} 
                    disabled={!selectedPart || !quantity}
                    size="sm"
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Part
                </Button>
            </CardContent>
        </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{machine ? 'Edit Machine' : 'Add Machine'}</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
                <TabsList>
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    {machine && <TabsTrigger value="prizes">Prizes</TabsTrigger>}
                    {machine && <TabsTrigger value="parts">Parts</TabsTrigger>}
                </TabsList>

                <TabsContent value="basic">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Machine Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter machine name"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="type">Machine Type *</Label>
                            <Input
                                id="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                placeholder="e.g., Claw Machine, Arcade Game"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="serial_number">Serial Number</Label>
                            <Input
                                id="serial_number"
                                value={formData.serial_number}
                                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                placeholder="Enter serial number"
                            />
                        </div>
                        <div>
                            <Label htmlFor="venue">Venue</Label>
                            <Select value={formData.venue_id} onValueChange={(value) => setFormData({ ...formData, venue_id: value })}>
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
                            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
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
                            onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
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
                </TabsContent>

                {machine && (
                    <TabsContent value="prizes" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <AddPrizeForm />
                            </div>
                            <div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Package className="h-4 w-4" />
                                            Current Prizes ({machineStock.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {machineStock.length === 0 ? (
                                            <p className="text-gray-500 text-sm">No prizes in this machine</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {machineStock.map((stock) => {
                                                    const prizeName = stock.prizes?.name || 'Unknown Prize';
                                                    const prizeCost = stock.prizes?.cost || 0;
                                                    
                                                    return (
                                                        <div key={stock.id} className="flex items-center justify-between p-2 border rounded">
                                                            <div className="flex-1">
                                                                <div className="font-medium text-sm">
                                                                    {prizeName}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    Quantity: {stock.quantity} • Cost: ${prizeCost.toFixed(2)}
                                                                    {stock.notes && ` • ${stock.notes}`}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => removePrizeFromMachine(stock.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                )}

                {machine && (
                    <TabsContent value="parts" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <AddPartForm />
                            </div>
                            <div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Wrench className="h-4 w-4" />
                                            Current Parts ({machineParts.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {machineParts.length === 0 ? (
                                            <p className="text-gray-500 text-sm">No parts assigned to this machine</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {machineParts.map((machinePart) => {
                                                    const partName = machinePart.parts?.name || 'Unknown Part';
                                                    const partCost = machinePart.parts?.cost_price || 0;
                                                    
                                                    return (
                                                        <div key={machinePart.id} className="flex items-center justify-between p-2 border rounded">
                                                            <div className="flex-1">
                                                                <div className="font-medium text-sm">
                                                                    {partName}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    Quantity: {machinePart.quantity} • Cost: ${partCost.toFixed(2)}
                                                                    {machinePart.notes && ` • ${machinePart.notes}`}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => removePartFromMachine(machinePart.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </DialogContent>
    </Dialog>
  );

  };

  export default MachineEditDialog;