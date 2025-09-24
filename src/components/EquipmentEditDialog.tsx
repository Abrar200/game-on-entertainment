import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Package, Info, History, Camera } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Equipment {
  id: string;
  name: string;
  description?: string;
  category: string;
  serial_number?: string;
  asset_tag?: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  condition: string;
  status: string;
  venue_id?: string;
  hired_date?: string;
  expected_return_date?: string;
  notes?: string;
  image_url?: string;
  venue?: any;
}

interface EquipmentEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  equipment?: Equipment | null;
}

export const EquipmentEditDialog: React.FC<EquipmentEditDialogProps> = ({
  isOpen,
  onClose,
  equipment
}) => {
  const { venues } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipmentHistory, setEquipmentHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    serial_number: '',
    asset_tag: '',
    brand: '',
    model: '',
    purchase_date: '',
    purchase_cost: '',
    current_value: '',
    condition: 'good',
    status: 'available',
    venue_id: '',
    hired_date: '',
    expected_return_date: '',
    notes: '',
    image_url: ''
  });

  const categories = [
    { value: 'trolleys', label: 'Trolleys', icon: '🚐' },
    { value: 'electronics', label: 'Electronics', icon: '📱' },
    { value: 'computers', label: 'Computers', icon: '💻' },
    { value: 'keys', label: 'Keys', icon: '🔑' },
    { value: 'access_control', label: 'Access Control', icon: '🎫' },
    { value: 'tools', label: 'Tools', icon: '🔧' },
    { value: 'furniture', label: 'Furniture', icon: '🪑' },
    { value: 'general', label: 'General', icon: '📦' }
  ];

  const conditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'needs_repair', label: 'Needs Repair' }
  ];

  const statuses = [
    { value: 'available', label: 'Available' },
    { value: 'hired', label: 'On Hire' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'retired', label: 'Retired' },
    { value: 'lost', label: 'Lost' },
    { value: 'damaged', label: 'Damaged' }
  ];

  useEffect(() => {
    if (isOpen) {
      if (equipment) {
        setFormData({
          name: equipment.name || '',
          description: equipment.description || '',
          category: equipment.category || 'general',
          serial_number: equipment.serial_number || '',
          asset_tag: equipment.asset_tag || '',
          brand: equipment.brand || '',
          model: equipment.model || '',
          purchase_date: equipment.purchase_date || '',
          purchase_cost: equipment.purchase_cost?.toString() || '',
          current_value: equipment.current_value?.toString() || '',
          condition: equipment.condition || 'good',
          status: equipment.status || 'available',
          venue_id: equipment.venue_id || '',
          hired_date: equipment.hired_date || '',
          expected_return_date: equipment.expected_return_date || '',
          notes: equipment.notes || '',
          image_url: equipment.image_url || ''
        });
        fetchEquipmentHistory(equipment.id);
      } else {
        // Reset form for new equipment
        setFormData({
          name: '',
          description: '',
          category: 'general',
          serial_number: '',
          asset_tag: '',
          brand: '',
          model: '',
          purchase_date: '',
          purchase_cost: '',
          current_value: '',
          condition: 'good',
          status: 'available',
          venue_id: '',
          hired_date: '',
          expected_return_date: '',
          notes: '',
          image_url: ''
        });
        setEquipmentHistory([]);
      }
    }
  }, [isOpen, equipment]);

  const fetchEquipmentHistory = async (equipmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('equipment_hire_history')
        .select(`
          *,
          from_venue:venues!from_venue_id(name),
          to_venue:venues!to_venue_id(name)
        `)
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching equipment history:', error);
        return;
      }

      setEquipmentHistory(data || []);
    } catch (error) {
      console.error('Error fetching equipment history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Equipment name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const equipmentData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        serial_number: formData.serial_number.trim() || null,
        asset_tag: formData.asset_tag.trim() || null,
        brand: formData.brand.trim() || null,
        model: formData.model.trim() || null,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        condition: formData.condition,
        status: formData.status,
        venue_id: formData.venue_id || null,
        hired_date: formData.hired_date || null,
        expected_return_date: formData.expected_return_date || null,
        notes: formData.notes.trim() || null,
        image_url: formData.image_url || null
      };

      if (equipment) {
        // Updating existing equipment
        const { error } = await supabase
          .from('equipment_hire')
          .update(equipmentData)
          .eq('id', equipment.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Equipment updated successfully!' });
      } else {
        // Creating new equipment
        const { error } = await supabase
          .from('equipment_hire')
          .insert([equipmentData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Equipment added successfully!' });
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error saving equipment:', error);
      
      let errorMessage = 'Failed to save equipment';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (field: string, date: Date | undefined) => {
    setFormData({
      ...formData,
      [field]: date ? format(date, 'yyyy-MM-dd') : ''
    });
  };

  const getDateValue = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    try {
      return parseISO(dateString);
    } catch (error) {
      return undefined;
    }
  };

  const formatHistoryDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy HH:mm');
    } catch (error) {
      return dateString;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'hired': return '📤';
      case 'returned': return '📥';
      case 'transferred': return '🔄';
      case 'maintenance': return '🔧';
      case 'created': return '✨';
      case 'retired': return '🏁';
      default: return '📝';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {equipment ? 'Edit Equipment' : 'Add Equipment'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Details & Financials</TabsTrigger>
            <TabsTrigger value="location">Location & Status</TabsTrigger>
            {equipment && <TabsTrigger value="history">History</TabsTrigger>}
          </TabsList>

          <TabsContent value="basic">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Equipment Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter equipment name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          <span className="flex items-center gap-2">
                            <span>{category.icon}</span>
                            {category.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the equipment..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Equipment brand"
                  />
                </div>
                
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Model number"
                  />
                </div>
              </div>

              <ImageUpload
                folder="equipment"
                currentImage={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              />
            </form>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Serial number"
                />
              </div>
              
              <div>
                <Label htmlFor="asset_tag">Asset Tag</Label>
                <Input
                  id="asset_tag"
                  value={formData.asset_tag}
                  onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                  placeholder="Internal asset tag"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Purchase Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !getDateValue(formData.purchase_date) && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {getDateValue(formData.purchase_date) 
                        ? format(getDateValue(formData.purchase_date)!, 'PPP') 
                        : 'Select date'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={getDateValue(formData.purchase_date)}
                      onSelect={(date) => handleDateChange('purchase_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="purchase_cost">Purchase Cost ($)</Label>
                <Input
                  id="purchase_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchase_cost}
                  onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="current_value">Current Value ($)</Label>
                <Input
                  id="current_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              
              <div>
                <Label htmlFor="venue">Current Location</Label>
                <Select 
                    value={formData.venue_id || "no-venue"} 
                    onValueChange={(value) => setFormData({ ...formData, venue_id: value === "no-venue" ? "" : value })}
                >
                    <SelectTrigger>
                    <SelectValue placeholder="Select venue (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="no-venue">No venue assigned</SelectItem>
                    {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
            </div>

            {formData.status === 'hired' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Hired Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !getDateValue(formData.hired_date) && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {getDateValue(formData.hired_date) 
                          ? format(getDateValue(formData.hired_date)!, 'PPP') 
                          : 'Select date'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={getDateValue(formData.hired_date)}
                        onSelect={(date) => handleDateChange('hired_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Expected Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !getDateValue(formData.expected_return_date) && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {getDateValue(formData.expected_return_date) 
                          ? format(getDateValue(formData.expected_return_date)!, 'PPP') 
                          : 'Select date'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={getDateValue(formData.expected_return_date)}
                        onSelect={(date) => handleDateChange('expected_return_date', date)}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={4}
              />
            </div>
          </TabsContent>

          {equipment && (
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Equipment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {equipmentHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No history records found for this equipment.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {equipmentHistory.map((record, index) => (
                        <div key={record.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{getActionIcon(record.action)}</span>
                              <div>
                                <h4 className="font-medium capitalize">
                                  {record.action.replace('_', ' ')}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {record.notes}
                                </p>
                                {record.from_venue && (
                                  <p className="text-sm text-gray-500">
                                    From: {record.from_venue.name}
                                  </p>
                                )}
                                {record.to_venue && (
                                  <p className="text-sm text-gray-500">
                                    To: {record.to_venue.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {formatHistoryDate(record.created_at)}
                              </p>
                              {record.performed_by && (
                                <p className="text-xs text-gray-500">
                                  by {record.performed_by}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <div className="flex gap-2 pt-4">
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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : (equipment ? 'Update' : 'Add')}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentEditDialog;