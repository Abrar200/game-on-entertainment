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
  width = 300, 
  height = 100 
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
      
      // Use JsBarcode to generate a proper Code 128 barcode
      JsBarcode(canvasRef.current, value, {
        ...generateBarcodeOptions(),
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
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Error generating barcode', width / 2, height / 2 - 20);
        ctx.fillText(`Barcode: ${value}`, width / 2, height / 2);
        ctx.fillText('Using text fallback', width / 2, height / 2 + 20);
      }
    }
  }, [value, width, height]);
  
  if (!value) return null;
  
  return (
    <div className="flex flex-col items-center justify-center space-y-2 w-full">
      <div className="flex justify-center w-full">
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          className="border border-gray-300 bg-white mx-auto barcode-canvas"
        />
      </div>
    </div>
  );
};

export default BarcodeGenerator;