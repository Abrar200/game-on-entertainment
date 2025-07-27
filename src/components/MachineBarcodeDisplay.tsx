import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, QrCode } from 'lucide-react';
import BarcodeGenerator from './BarcodeGenerator';
import { validateBarcodeValue } from '@/lib/barcodeUtils';

interface MachineBarcodeDisplayProps {
  barcode: string;
  machineName: string;
}

export const MachineBarcodeDisplay: React.FC<MachineBarcodeDisplayProps> = ({ 
  barcode, 
  machineName 
}) => {
  const handlePrint = () => {
    console.log('Printing barcode:', barcode);
    
    // Validate barcode before printing
    const validation = validateBarcodeValue(barcode);
    if (!validation.isValid) {
      console.error('Invalid barcode for printing:', validation.error);
      alert(`Cannot print barcode: ${validation.error}`);
      return;
    }
    
    // Get the canvas element from the current barcode display
    const canvas = document.querySelector('.barcode-canvas') as HTMLCanvasElement;
    if (!canvas) {
      alert('Barcode not found. Please wait for the barcode to load.');
      return;
    }
    
    // Convert canvas to data URL
    const barcodeDataUrl = canvas.toDataURL('image/png');
    
    // Create a print-friendly HTML content with the actual barcode image
    const printContent = `
      <html>
        <head>
          <title>Machine Barcode - ${machineName}</title>
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
            .machine-name { 
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
            <div class="machine-name">${machineName}</div>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-red-600" />
          Machine Barcode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-white text-center">
          <div className="text-sm font-semibold text-gray-600 mb-2">{machineName}</div>
          <BarcodeGenerator value={barcode} width={300} height={100} />
        </div>
        <Button 
          onClick={handlePrint}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Barcode
        </Button>
      </CardContent>
    </Card>
  );
};

export default MachineBarcodeDisplay;