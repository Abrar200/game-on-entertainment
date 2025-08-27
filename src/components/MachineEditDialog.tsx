import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Package, Wrench, CreditCard, X } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/lib/supabase';

interface MachineEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  machine?: any;
}

interface PayWaveTerminal {
  id?: string;
  name: string;
  terminal_number: string;
}

interface MachineStock {
  id: string;
  machine_id: string;
  prize_id: string;
  quantity: number;
  notes?: string;
  prizes?: any;
}

interface MachinePart {
  id: string;
  machine_id: string;
  part_id: string;
  quantity: number;
  notes?: string;
  parts?: any;
}

export const MachineEditDialog: React.FC<MachineEditDialogProps> = ({
  isOpen,
  onClose,
  machine
}) => {
  const { venues, prizes, parts, refreshData, addMachine, savePayWaveTerminals } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [machineStock, setMachineStock] = useState<MachineStock[]>([]);
  const [machineParts, setMachineParts] = useState<MachinePart[]>([]);
  const [payWaveTerminals, setPayWaveTerminals] = useState<PayWaveTerminal[]>([
    { name: '', terminal_number: '' }
  ]);
  
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
        fetchPayWaveTerminals();
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
        setPayWaveTerminals([{ name: '', terminal_number: '' }]);
      }
    }
  }, [isOpen, machine]);

  const fetchPayWaveTerminals = async () => {
    if (!machine?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('machine_paywave_terminals')
        .select('*')
        .eq('machine_id', machine.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching PayWave terminals:', error);
        setPayWaveTerminals([{ name: '', terminal_number: '' }]);
        return;
      }

      if (data && data.length > 0) {
        setPayWaveTerminals(data.map(terminal => ({
          id: terminal.id,
          name: terminal.name || '',
          terminal_number: terminal.terminal_number || ''
        })));
      } else {
        setPayWaveTerminals([{ name: '', terminal_number: '' }]);
      }
    } catch (error) {
      console.error('❌ Error fetching PayWave terminals:', error);
      setPayWaveTerminals([{ name: '', terminal_number: '' }]);
    }
  };

  const addPayWaveTerminal = () => {
    if (payWaveTerminals.length < 6) {
      // Optimistic update
      const newTerminals = [...payWaveTerminals, { name: '', terminal_number: '' }];
      setPayWaveTerminals(newTerminals);
    } else {
      toast({
        title: 'Maximum Reached',
        description: 'Maximum of 6 PayWave terminals allowed per machine',
        variant: 'destructive'
      });
    }
  };

  const removePayWaveTerminal = (index: number) => {
    if (payWaveTerminals.length > 1) {
      // Optimistic update
      const newTerminals = payWaveTerminals.filter((_, i) => i !== index);
      setPayWaveTerminals(newTerminals);
    }
  };

  const updatePayWaveTerminal = (index: number, field: 'name' | 'terminal_number', value: string) => {
    // Optimistic update
    const newTerminals = [...payWaveTerminals];
    newTerminals[index] = { ...newTerminals[index], [field]: value };
    setPayWaveTerminals(newTerminals);
  };

  const savePayWaveTerminalsLocal = async (machineId: string) => {
    try {
      // Delete existing terminals for this machine
      if (machine?.id) {
        await supabase
          .from('machine_paywave_terminals')
          .delete()
          .eq('machine_id', machineId);
      }

      // Filter out empty terminals
      const validTerminals = payWaveTerminals.filter(terminal => 
        terminal.name.trim() || terminal.terminal_number.trim()
      );

      if (validTerminals.length === 0) {
        console.log('No PayWave terminals to save');
        return;
      }

      // Insert new terminals
      const terminalsToInsert = validTerminals.map(terminal => ({
        machine_id: machineId,
        name: terminal.name.trim(),
        terminal_number: terminal.terminal_number.trim()
      }));

      const { error } = await supabase
        .from('machine_paywave_terminals')
        .insert(terminalsToInsert);

      if (error) {
        console.error('❌ Error saving PayWave terminals:', error);
        if (!error.message.includes('does not exist')) {
          throw error;
        }
      } else {
        console.log('✅ PayWave terminals saved successfully');
      }
    } catch (error) {
      console.error('❌ Error in savePayWaveTerminalsLocal:', error);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.type.trim()) {
      toast({ title: 'Error', description: 'Machine name and type are required', variant: 'destructive' });
      return;
    }

    // Validate PayWave terminals
    const validTerminals = payWaveTerminals.filter(terminal => 
      terminal.name.trim() || terminal.terminal_number.trim()
    );

    for (const terminal of validTerminals) {
      if (terminal.name.trim() && !terminal.terminal_number.trim()) {
        toast({ 
          title: 'Validation Error', 
          description: 'PayWave terminal number is required when name is provided',
          variant: 'destructive' 
        });
        return;
      }
      if (terminal.terminal_number.trim() && !terminal.name.trim()) {
        toast({ 
          title: 'Validation Error', 
          description: 'PayWave terminal name is required when number is provided',
          variant: 'destructive' 
        });
        return;
      }
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

      let machineId: string;

      if (machine) {
        // Updating existing machine
        const { error } = await supabase
          .from('machines')
          .update(machineData)
          .eq('id', machine.id);

        if (error) throw new Error(`Failed to update machine: ${error.message}`);
        machineId = machine.id;
        
        // Save PayWave terminals for existing machine
        await savePayWaveTerminalsLocal(machineId);
        
        toast({ title: 'Success', description: 'Machine updated successfully!' });
      } else {
        // Creating new machine
        const terminalData = validTerminals.map(terminal => ({
          name: terminal.name.trim(),
          terminal_number: terminal.terminal_number.trim()
        }));
        
        const result = await addMachine(machineData, terminalData);
        machineId = result?.id;
        
        if (!machineId) {
          throw new Error('Failed to get machine ID after creation');
        }
        
        toast({ title: 'Success', description: 'Machine added successfully!' });
      }
      
      // Trigger refresh to update the context and other components
      await refreshData();
      
      // Emit custom event to notify other components about machine update
      window.dispatchEvent(new CustomEvent('machineUpdated', { 
        detail: { 
          machineId, 
          updatedData: { ...machineData, paywave_terminals: validTerminals } 
        } 
      }));
      
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save machine';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimistic prize addition
  const addPrizeToMachine = async (prizeId: string, quantity: number, notes?: string) => {
    if (!machine?.id) return;

    try {
      // Find the prize for optimistic update
      const prize = prizes.find((p) => p.id === prizeId);
      if (!prize) return;

      // Create optimistic stock entry
      const optimisticStock: MachineStock = {
        id: `temp-${Date.now()}`, // Temporary ID
        machine_id: machine.id,
        prize_id: prizeId,
        quantity,
        notes,
        prizes: prize
      };

      // Optimistic update - add to local state immediately
      setMachineStock(prev => [...prev, optimisticStock]);

      // Background database update
      const { data, error } = await supabase
        .from('machine_stock')
        .insert([{ machine_id: machine.id, prize_id: prizeId, quantity, notes }])
        .select('*')
        .single();

      if (error) {
        // Revert optimistic update on error
        setMachineStock(prev => prev.filter(stock => stock.id !== optimisticStock.id));
        throw error;
      }

      // Replace temporary entry with real database entry
      setMachineStock(prev => 
        prev.map(stock => 
          stock.id === optimisticStock.id 
            ? { ...stock, id: data.id }
            : stock
        )
      );

      // Update prize stock
      if (prize) {
        const newStock = Math.max(0, prize.stock_quantity - quantity);
        await supabase.from('prizes').update({ stock_quantity: newStock }).eq('id', prizeId);
      }

      // Refresh data in background
      refreshData();
      toast({ title: 'Success', description: 'Prize added to machine!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add prize to machine', variant: 'destructive' });
    }
  };

  // Optimistic part addition
  const addPartToMachine = async (partId: string, quantity: number, notes?: string) => {
    if (!machine?.id) return;

    try {
      // Find the part for optimistic update
      const part = parts.find((p) => p.id === partId);
      if (!part) return;

      // Create optimistic part entry
      const optimisticPart: MachinePart = {
        id: `temp-${Date.now()}`, // Temporary ID
        machine_id: machine.id,
        part_id: partId,
        quantity,
        notes,
        parts: part
      };

      // Optimistic update - add to local state immediately
      setMachineParts(prev => [...prev, optimisticPart]);

      // Background database update
      const { data, error } = await supabase
        .from('machine_parts')
        .insert([{ machine_id: machine.id, part_id: partId, quantity, notes }])
        .select('*')
        .single();

      if (error) {
        // Revert optimistic update on error
        setMachineParts(prev => prev.filter(part => part.id !== optimisticPart.id));
        throw error;
      }

      // Replace temporary entry with real database entry
      setMachineParts(prev => 
        prev.map(part => 
          part.id === optimisticPart.id 
            ? { ...part, id: data.id }
            : part
        )
      );

      // Update part stock
      if (part) {
        const newStock = Math.max(0, part.stock_quantity - quantity);
        await supabase.from('parts').update({ stock_quantity: newStock }).eq('id', partId);
      }

      // Refresh data in background
      refreshData();
      toast({ title: 'Success', description: 'Part added to machine!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add part to machine', variant: 'destructive' });
    }
  };

  // Optimistic prize removal
  const removePrizeFromMachine = async (stockId: string) => {
    try {
      // Optimistic update - remove from local state immediately
      const stockToRemove = machineStock.find(stock => stock.id === stockId);
      setMachineStock(prev => prev.filter(stock => stock.id !== stockId));

      // Background database update
      const { error } = await supabase.from('machine_stock').delete().eq('id', stockId);
      
      if (error) {
        // Revert optimistic update on error
        if (stockToRemove) {
          setMachineStock(prev => [...prev, stockToRemove]);
        }
        throw error;
      }

      // Refresh data in background
      refreshData();
      toast({ title: 'Success', description: 'Prize removed from machine!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove prize', variant: 'destructive' });
    }
  };

  // Optimistic part removal
  const removePartFromMachine = async (partStockId: string) => {
    try {
      // Optimistic update - remove from local state immediately
      const partToRemove = machineParts.find(part => part.id === partStockId);
      setMachineParts(prev => prev.filter(part => part.id !== partStockId));

      // Background database update
      const { error } = await supabase
        .from('machine_parts')
        .delete()
        .eq('id', partStockId);

      if (error) {
        // Revert optimistic update on error
        if (partToRemove) {
          setMachineParts(prev => [...prev, partToRemove]);
        }
        throw error;
      }

      // Refresh data in background
      refreshData();
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
                    <TabsTrigger value="paywave">PayWave Terminals</TabsTrigger>
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

                <TabsContent value="paywave" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                PayWave Terminals
                                <Badge variant="secondary" className="ml-2">
                                    {payWaveTerminals.filter(t => t.name.trim() || t.terminal_number.trim()).length} / 6
                                </Badge>
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Add PayWave terminal information for this machine. Most machines have 1 terminal, but some can have up to 6.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {payWaveTerminals.map((terminal, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                                        {index + 1}
                                    </div>
                                    
                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs">Terminal Name</Label>
                                            <Input
                                                placeholder="e.g., Main Terminal, Player 1"
                                                value={terminal.name}
                                                onChange={(e) => updatePayWaveTerminal(index, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Terminal Number</Label>
                                            <Input
                                                placeholder="e.g., 12345678"
                                                value={terminal.terminal_number}
                                                onChange={(e) => updatePayWaveTerminal(index, 'terminal_number', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    
                                    {payWaveTerminals.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removePayWaveTerminal(index)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            
                            {payWaveTerminals.length < 6 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addPayWaveTerminal}
                                    className="w-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add PayWave Terminal ({payWaveTerminals.length}/6)
                                </Button>
                            )}
                            
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> Only terminals with both name and number will be saved. 
                                    Empty terminals will be ignored.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
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