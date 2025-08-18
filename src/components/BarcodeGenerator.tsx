import React from 'react';
import JsBarcode from 'jsbarcode';
import { validateBarcodeValue, generateBarcodeOptions } from '@/lib/barcodeUtils';

interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ 
  value, 
  width = 200, // Reduced from 300
  height = 60   // Reduced from 100
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    if (!canvasRef.current || !value) return;
    
    try {
      console.log('Generating barcode for:', value);
      
      // Validate the barcode value first
      const validation = validateBarcodeValue(value);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid barcode value');
      }
      
      // Use JsBarcode to generate a proper Code 128 barcode with smaller dimensions
      JsBarcode(canvasRef.current, value, {
        ...generateBarcodeOptions(),
        width: 1.5,        // Reduced from 2
        height: 50,        // Reduced from 80
        fontSize: 10,      // Reduced from 12
        margin: 5,         // Reduced from 10
        marginTop: 5,      // Reduced from 10
        marginBottom: 5,   // Reduced from 10
        marginLeft: 5,     // Reduced from 10
        marginRight: 5,    // Reduced from 10
        valid: function(valid) {
          if (!valid) {
            console.error('JsBarcode validation failed for:', value);
            throw new Error('JsBarcode validation failed');
          }
        }
      });
      
      console.log('Barcode generated successfully for:', value);
    } catch (error) {
      console.error('Error generating barcode');
      console.error('Barcode:', value);
      console.error('Error:', error);
      
      // Fallback to simple text display
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'black';
        ctx.font = '10px monospace';  // Reduced font size
        ctx.textAlign = 'center';
        ctx.fillText('Error generating barcode', width / 2, height / 2 - 15);
        ctx.fillText(`Barcode: ${value}`, width / 2, height / 2);
        ctx.fillText('Using text fallback', width / 2, height / 2 + 15);
      }
    }
  }, [value, width, height]);
  
  if (!value) return null;
  
  return (
    <div className="flex flex-col items-center justify-center space-y-1 w-full">
      <div className="flex justify-center w-full">
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          className="border border-gray-300 bg-white mx-auto barcode-canvas"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
};

export default BarcodeGenerator;