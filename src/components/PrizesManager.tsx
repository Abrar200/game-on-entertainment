import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Gift, Package, Trash2, Edit, Scan, Search, Printer } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import PrizeEditDialog from '@/components/PrizeEditDialog';
import AutoBarcodeScanner from '@/components/AutoBarcodeScanner';
import BarcodeGenerator from '@/components/BarcodeGenerator';
import { supabase } from '@/lib/supabase';
import { createImageWithFallback } from '@/lib/imageUtils';

interface PrizesManagerProps {
  readOnly?: boolean;
}

const PrizesManager: React.FC<PrizesManagerProps> = ({ readOnly = false }) => {
  const { prizes, addPrize, deletePrize, updatePrizeStock } = useAppContext();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrize, setSelectedPrize] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, prizeId: string, prizeName: string }>({
    open: false, prizeId: '', prizeName: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    stock_quantity: '',
    image_url: ''
  });

  const generatePrizeBarcode = (name: string): string => {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PRIZE_${cleanName}_${timestamp}_${random}`;
  };

  // FIX: Improved print barcode with proper JsBarcode loading
  const handlePrintBarcode = (barcode: string, prizeName: string) => {
    console.log('Printing prize barcode:', barcode);
    
    // Get the canvas element from the current barcode display
    const barcodeDisplays = document.querySelectorAll('.barcode-canvas');
    let canvas: HTMLCanvasElement | null = null;
    
    // Find the canvas for this specific barcode
    barcodeDisplays.forEach((canvasElement) => {
      const canvasEl = canvasElement as HTMLCanvasElement;
      // Check if this canvas is in the same card as our prize
      const cardElement = canvasEl.closest('.hover\\:shadow-lg');
      if (cardElement) {
        const cardText = cardElement.textContent || '';
        if (cardText.includes(prizeName)) {
          canvas = canvasEl;
        }
      }
    });
    
    if (!canvas) {
      alert('Barcode not found. Please wait for the barcode to load.');
      return;
    }
    
    // Convert canvas to data URL
    const barcodeDataUrl = canvas.toDataURL('image/png');
    
    // Create a print-friendly HTML content
    const printContent = `
      <html>
        <head>
          <title>Prize Barcode - ${prizeName}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none !important; }
            }
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              margin: 40px;
              background: white;
            }
            .barcode-container { 
              border: 2px solid #000; 
              padding: 20px; 
              display: inline-block;
              background: white;
            }
            .prize-name { 
              font-size: 18px; 
              font-weight: bold; 
              margin-bottom: 20px; 
            }
            .barcode-image {
              margin: 20px 0;
              max-width: 100%;
              height: auto;
            }
            .barcode-text { 
              font-family: monospace; 
              font-size: 14px; 
              margin-top: 10px; 
              font-weight: bold;
            }
            .print-instructions {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="prize-name">${prizeName}</div>
            <img src="${barcodeDataUrl}" alt="Barcode" class="barcode-image" />
            <div class="barcode-text">${barcode}</div>
          </div>
          <div class="print-instructions no-print">
            <p>Click Print or use Ctrl+P to print this barcode</p>
          </div>
          <script>
            // Auto-trigger print dialog after page loads
            window.addEventListener('load', function() {
              setTimeout(() => {
                window.print();
              }, 500);
            });
            
            // Close window after printing or canceling
            window.addEventListener('afterprint', () => {
              setTimeout(() => window.close(), 1000);
            });
          </script>
        </body>
      </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
    } else {
      // Fallback: use browser's native print for current page
      alert('Pop-up blocked. Please allow pop-ups for printing or use your browser\'s print function.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    if (!formData.stock_quantity || Number(formData.stock_quantity) < 0) {
      toast({ title: 'Error', description: 'Valid stock quantity is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const barcode = generatePrizeBarcode(formData.name);
      
      const prizeData = {
        name: formData.name.trim(),
        cost: Number(formData.cost),
        stock_quantity: Number(formData.stock_quantity),
        image_url: formData.image_url || null,
        barcode
      };

      console.log('Submitting prize data:', prizeData);

      await addPrize(prizeData);

      // Reset form and close dialog
      setFormData({ name: '', cost: '', stock_quantity: '', image_url: '' });
      setIsDialogOpen(false);

      toast({ title: 'Success', description: 'Prize added successfully!' });

    } catch (error) {
      console.error('Error adding prize:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add prize';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({ open: true, prizeId: id, prizeName: name });
  };

  const handleDeleteConfirm = async () => {
    try {
      await deletePrize(deleteDialog.prizeId);
      toast({ title: 'Success', description: 'Prize deleted successfully!' });
    } catch (error) {
      console.error('Error deleting prize:', error);
      toast({ title: 'Error', description: 'Failed to delete prize', variant: 'destructive' });
    } finally {
      setDeleteDialog({ open: false, prizeId: '', prizeName: '' });
    }
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPrize && stockQuantity) {
      try {
        await updatePrizeStock(selectedPrize, Number(stockQuantity));
        setIsStockDialogOpen(false);
        setSelectedPrize('');
        setStockQuantity('');
        toast({ title: 'Success', description: 'Stock updated successfully!' });
      } catch (error) {
        console.error('Error updating stock:', error);
        toast({ title: 'Error', description: 'Failed to update stock', variant: 'destructive' });
      }
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

  // FIX: Handle prize-specific barcode scanning
  const handleScanResult = async (barcode: string) => {
    console.log('📱 Scanned barcode in PrizesManager:', barcode);
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (error) throw error;

      if (data) {
        console.log('✅ Prize found by barcode:', data);
        openEditDialog(data.id);
        toast({
          title: 'Prize Found!',
          description: `Selected ${data.name} for editing`
        });
      }
    } catch (error) {
      console.error('❌ Prize not found or error:', error);
      toast({
        title: 'Prize Not Found',
        description: `No prize found with barcode: ${barcode}`,
        variant: 'destructive'
      });
    }
    setIsScannerOpen(false);
  };

  // Filter prizes based on search term
  const filteredPrizes = prizes.filter(prize =>
    prize.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prize.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Prizes Management</h2>
          <p className="text-gray-600 mt-2">Manage prize inventory and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsScannerOpen(true)} variant="outline">
            <Scan className="h-4 w-4 mr-2" />
            Scan Prize
          </Button>
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
                  <Label htmlFor="name">Prize Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter prize name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Cost ($) *</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="Enter cost"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Initial Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="Enter initial stock"
                    required
                  />
                </div>
                <ImageUpload
                  folder="prizes"
                  currentImage={formData.image_url}
                  onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Adding...' : 'Add Prize'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search prizes by name or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrizes.map((prize) => {
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
                {/* FIX: Use proper image handling */}
                {prize.image_url && (
                  <div className="mb-4">
                    <img
                      {...createImageWithFallback(prize.image_url, prizeName, 'prize')}
                      className="w-full h-32 object-cover rounded"
                      crossOrigin="anonymous"
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

                {prize.barcode && (
                  <div className="border-t pt-4">
                    <BarcodeGenerator value={prize.barcode} width={200} height={60} />
                    <div className="mt-2 flex justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintBarcode(prize.barcode!, prizeName)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Barcode
                      </Button>
                    </div>
                  </div>
                )}

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

      {filteredPrizes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Gift className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              {searchTerm ? 'No prizes found matching your search' : 'No prizes added yet. Click "Add New Prize" to get started.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Scanner */}
      <AutoBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
      />

      <ConfirmDeleteDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, prizeId: '', prizeName: '' })}
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStockDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Update Stock
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrizesManager;