import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wrench, Trash2, Edit, Package, AlertTriangle, Scan, Search, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import AutoBarcodeScanner from '@/components/AutoBarcodeScanner';
import BarcodeGenerator from '@/components/BarcodeGenerator';
import { generateMachineBarcode } from '@/lib/barcodeUtils';
import { createImageWithFallback } from '@/lib/imageUtils';

interface Part {
  id: string;
  name: string;
  cost_price: number;
  stock_quantity: number;
  image_url?: string;
  barcode?: string;
  low_stock_limit: number;
  created_at: string;
}

const PartsManager: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, partId: string, partName: string}>({
    open: false, partId: '', partName: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    cost_price: '',
    stock_quantity: '',
    low_stock_limit: '5',
    image_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      console.log('🔍 Fetching parts from database...');
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Fetched parts:', data);
      setParts(data || []);
      
      // Check for low stock and send notifications
      checkLowStock(data || []);
    } catch (error) {
      console.error('❌ Error fetching parts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch parts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkLowStock = async (partsData: Part[]) => {
    const lowStockParts = partsData.filter(part => 
      part.stock_quantity <= part.low_stock_limit
    );

    if (lowStockParts.length > 0) {
      console.log('⚠️ Low stock parts found:', lowStockParts);
      try {
        await supabase.functions.invoke('send-low-stock-email', {
          body: {
            parts: lowStockParts,
            recipient: 'Workshop@gameonentertainment.com.au'
          }
        });
        console.log('📧 Low stock notification sent');
      } catch (error) {
        console.error('❌ Failed to send low stock notification:', error);
      }
    }
  };

  const generatePartBarcode = (name: string): string => {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PART_${cleanName}_${timestamp}_${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Starting part submission with data:', formData);
    
    if (!formData.name.trim()) {
      console.error('❌ Validation failed: Part name is required');
      toast({ title: 'Error', description: 'Part name is required', variant: 'destructive' });
      return;
    }

    if (!formData.cost_price || Number(formData.cost_price) <= 0) {
      console.error('❌ Validation failed: Valid cost is required');
      toast({ title: 'Error', description: 'Valid cost is required', variant: 'destructive' });
      return;
    }

    if (!formData.stock_quantity || Number(formData.stock_quantity) < 0) {
      console.error('❌ Validation failed: Valid stock quantity is required');
      toast({ title: 'Error', description: 'Valid stock quantity is required', variant: 'destructive' });
      return;
    }

    try {
      const barcode = generatePartBarcode(formData.name);
      console.log('🏷️ Generated barcode:', barcode);
      
      const partData = {
        name: formData.name.trim(),
        cost_price: parseFloat(formData.cost_price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_limit: parseInt(formData.low_stock_limit) || 5,
        image_url: formData.image_url || null,
        barcode
      };

      console.log('💾 Submitting part data to database:', partData);

      const { data, error } = await supabase
        .from('parts')
        .insert([partData])
        .select();

      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }

      console.log('✅ Part inserted successfully:', data);

      toast({ title: 'Success', description: 'Part added successfully!' });
      setFormData({ name: '', cost_price: '', stock_quantity: '', low_stock_limit: '5', image_url: '' });
      setIsDialogOpen(false);
      fetchParts();
    } catch (error) {
      console.error('❌ Error adding part:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add part';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleEdit = (part: Part) => {
    console.log('✏️ Editing part:', part);
    setSelectedPart(part);
    setFormData({
      name: part.name,
      cost_price: part.cost_price.toString(),
      stock_quantity: part.stock_quantity.toString(),
      low_stock_limit: part.low_stock_limit.toString(),
      image_url: part.image_url || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;

    console.log('🔄 Updating part:', selectedPart.id, 'with data:', formData);

    try {
      const partData = {
        name: formData.name.trim(),
        cost_price: parseFloat(formData.cost_price) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_limit: parseInt(formData.low_stock_limit) || 5,
        image_url: formData.image_url || null
      };

      console.log('💾 Updating database with:', partData);

      const { error } = await supabase
        .from('parts')
        .update(partData)
        .eq('id', selectedPart.id);

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ Part updated successfully');

      toast({ title: 'Success', description: 'Part updated successfully!' });
      setIsEditDialogOpen(false);
      setSelectedPart(null);
      fetchParts();
    } catch (error) {
      console.error('❌ Error updating part:', error);
      toast({ title: 'Error', description: 'Failed to update part', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    console.log('🗑️ Deleting part:', deleteDialog.partId);
    try {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', deleteDialog.partId);

      if (error) {
        console.error('❌ Database delete error:', error);
        throw error;
      }

      console.log('✅ Part deleted successfully');

      toast({ title: 'Success', description: 'Part deleted successfully!' });
      fetchParts();
    } catch (error) {
      console.error('❌ Error deleting part:', error);
      toast({ title: 'Error', description: 'Failed to delete part', variant: 'destructive' });
    } finally {
      setDeleteDialog({ open: false, partId: '', partName: '' });
    }
  };

  // FIX: Handle part-specific barcode scanning
  const handleScanResult = async (barcode: string) => {
    console.log('📱 Scanned barcode in PartsManager:', barcode);
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (error) {
        console.error('❌ Error finding part by barcode:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Part found by barcode:', data);
        handleEdit(data);
        toast({
          title: 'Part Found!',
          description: `Selected ${data.name} for editing`
        });
      }
    } catch (error) {
      console.error('❌ Part not found or error:', error);
      toast({
        title: 'Part Not Found',
        description: `No part found with barcode: ${barcode}`,
        variant: 'destructive'
      });
    }
    setIsScannerOpen(false);
  };

  // FIX: Improved print barcode with proper JsBarcode loading
  const handlePrintBarcode = (barcode: string, partName: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Barcode - ${partName}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
              }
              .barcode-container { 
                text-align: center; 
                margin: 20px; 
                page-break-inside: avoid; 
              }
              .part-name { 
                font-size: 14px; 
                font-weight: bold; 
                margin-bottom: 10px; 
              }
              .barcode-text { 
                font-size: 10px; 
                margin-top: 5px; 
                font-family: monospace; 
              }
              canvas { 
                border: 1px solid #ccc; 
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="barcode-container">
              <div class="part-name">${partName}</div>
              <canvas id="barcode"></canvas>
              <div class="barcode-text">${barcode}</div>
            </div>
            <script>
              // Wait for JsBarcode to load, then generate barcode
              function loadJsBarcode() {
                return new Promise((resolve, reject) => {
                  const script = document.createElement('script');
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js';
                  script.onload = resolve;
                  script.onerror = reject;
                  document.head.appendChild(script);
                });
              }

              loadJsBarcode().then(() => {
                const canvas = document.getElementById('barcode');
                if (window.JsBarcode && canvas) {
                  JsBarcode(canvas, "${barcode}", {
                    format: "CODE128",
                    width: 2,
                    height: 60,
                    displayValue: false
                  });
                  
                  // Auto print after barcode is generated
                  setTimeout(() => {
                    window.print();
                  }, 500);
                } else {
                  console.error('JsBarcode failed to load or canvas not found');
                  alert('Failed to generate barcode for printing');
                }
              }).catch(error => {
                console.error('Failed to load JsBarcode:', error);
                alert('Failed to load barcode library');
              });

              window.onafterprint = function() {
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockParts = parts.filter(part => part.stock_quantity <= part.low_stock_limit);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading parts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Parts Management</h2>
          <p className="text-gray-600 mt-2">Manage machine parts and maintenance inventory</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsScannerOpen(true)} variant="outline">
            <Scan className="h-4 w-4 mr-2" />
            Scan Part
          </Button>
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
                  <Label htmlFor="name">Part Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter part name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Cost ($) *</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                    placeholder="Enter cost"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    placeholder="Enter stock quantity"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lowStock">Low Stock Alert Limit *</Label>
                  <Input
                    id="lowStock"
                    type="number"
                    min="1"
                    value={formData.low_stock_limit}
                    onChange={(e) => setFormData({...formData, low_stock_limit: e.target.value})}
                    placeholder="Enter low stock limit"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Email alerts will be sent when stock falls to or below this limit
                  </p>
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
      </div>

      {/* Low Stock Alert */}
      {lowStockParts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-2">
              {lowStockParts.length} part(s) are running low on stock:
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStockParts.map(part => (
                <span key={part.id} className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-sm">
                  {part.name} ({part.stock_quantity} left)
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search parts by name or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Parts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParts.map((part) => (
          <Card key={part.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{part.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(part)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => setDeleteDialog({open: true, partId: part.id, partName: part.name})}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* FIX: Use proper image handling */}
              {part.image_url && (
                <div className="mb-4">
                  <img
                    {...createImageWithFallback(part.image_url, part.name, 'prize')}
                    className="w-full h-32 object-cover rounded"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Cost:</span>
                  <div className="font-semibold">${part.cost_price.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Stock:</span>
                  <div className={`font-semibold ${part.stock_quantity <= part.low_stock_limit ? 'text-red-600' : ''}`}>
                    {part.stock_quantity}
                    {part.stock_quantity <= part.low_stock_limit && (
                      <AlertTriangle className="inline h-4 w-4 ml-1" />
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm">
                <span className="text-gray-500">Low Stock Alert:</span>
                <div className="font-semibold">{part.low_stock_limit}</div>
              </div>

              {part.barcode && (
                <div className="border-t pt-4">
                  <BarcodeGenerator value={part.barcode} width={200} height={60} />
                  <div className="mt-2 flex justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintBarcode(part.barcode!, part.name)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Barcode
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredParts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              {searchTerm ? 'No parts found matching your search' : 'No parts added yet. Click "Add New Part" to get started.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Part</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="editName">Part Name *</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="editCost">Cost ($) *</Label>
              <Input
                id="editCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price}
                onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="editStock">Stock Quantity *</Label>
              <Input
                id="editStock"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="editLowStock">Low Stock Alert Limit *</Label>
              <Input
                id="editLowStock"
                type="number"
                min="1"
                value={formData.low_stock_limit}
                onChange={(e) => setFormData({...formData, low_stock_limit: e.target.value})}
                required
              />
            </div>
            <ImageUpload
              folder="parts"
              currentImage={formData.image_url}
              onImageUploaded={(url) => setFormData({...formData, image_url: url})}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Update Part
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scanner */}
      <AutoBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({open: false, partId: '', partName: ''})}
        onConfirm={handleDelete}
        itemType="Part"
        itemName={deleteDialog.partName}
      />
    </div>
  );
};

export default PartsManager;