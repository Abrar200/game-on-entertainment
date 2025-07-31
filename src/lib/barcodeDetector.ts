// src/lib/barcodeDetector.ts - NPM package version
// Run: npm install @zxing/library@0.20.0

import { BrowserMultiFormatReader } from '@zxing/library';

export interface BarcodeResult {
  text: string;
  confidence: number;
  format?: string;
}

export class BarcodeProcessor {
  private lastProcessTime = 0;
  private processInterval = 400;
  private reader: BrowserMultiFormatReader;

  constructor() {
    this.reader = new BrowserMultiFormatReader();
    console.log('✅ ZXing reader initialized from npm package');
  }

  shouldProcess(): boolean {
    const now = Date.now();
    if (now - this.lastProcessTime >= this.processInterval) {
      this.lastProcessTime = now;
      return true;
    }
    return false;
  }

  async decode(canvas: HTMLCanvasElement): Promise<BarcodeResult | null> {
    try {
      // Convert canvas to image data URL
      const dataURL = canvas.toDataURL('image/png');
      const img = document.createElement('img');

      return new Promise((resolve) => {
        img.onload = async () => {
          try {
            // Try to decode from the image element
            const result = await this.reader.decodeFromImageElement(img);

            if (result) {
              resolve({
                text: result.getText(),
                confidence: 0.8,
                format: result.getBarcodeFormat()?.toString() || 'unknown'
              });
            } else {
              resolve(null);
            }
          } catch (decodeError) {
            resolve(null);
          }
        };

        img.onerror = () => resolve(null);

        // Timeout to prevent hanging
        setTimeout(() => resolve(null), 2000);

        img.src = dataURL;
      });
    } catch (error) {
      return null;
    }
  }

  reset(): void {
    this.lastProcessTime = 0;
  }

  destroy(): void {
    try {
      this.reader?.reset();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Enhanced image processing
export const enhanceImageForBarcode = (imageData: ImageData): ImageData => {
  const data = imageData.data;
  const enhanced = new ImageData(imageData.width, imageData.height);
  const enhancedData = enhanced.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const enhanced = gray > 128 ? 255 : 0;

    enhancedData[i] = enhanced;
    enhancedData[i + 1] = enhanced;
    enhancedData[i + 2] = enhanced;
    enhancedData[i + 3] = 255;
  }

  return enhanced;
};

// Main detection function
export const detectBarcode = async (imageData: ImageData, processor: BarcodeProcessor): Promise<BarcodeResult | null> => {
  console.log('🔍 Starting barcode detection, image size:', imageData.width, 'x', imageData.height);

  try {
    // Try native BarcodeDetector first if available
    if ('BarcodeDetector' in window) {
      console.log('📱 Trying native BarcodeDetector...');
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code']
        });

        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.putImageData(imageData, 0, 0);
          const barcodes = await barcodeDetector.detect(canvas);

          if (barcodes.length > 0) {
            const barcode = barcodes[0];
            console.log('✅ Native detector found:', barcode.rawValue);
            return {
              text: barcode.rawValue,
              confidence: 0.9,
              format: barcode.format
            };
          } else {
            console.log('📱 Native detector found no barcodes');
          }
        }
      } catch (nativeError) {
        console.log('❌ Native detector failed:', nativeError.message);
      }
    } else {
      console.log('📚 Native BarcodeDetector not available');
    }

    // Use ZXing as fallback
    console.log('🔄 Trying ZXing detection...');
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.log('❌ Could not get canvas context');
      return null;
    }

    // Try original image first
    ctx.putImageData(imageData, 0, 0);
    let result = await processor.decode(canvas);

    if (!result) {
      // Try enhanced image
      console.log('🔄 Trying enhanced image...');
      const enhancedImageData = enhanceImageForBarcode(imageData);
      ctx.putImageData(enhancedImageData, 0, 0);
      result = await processor.decode(canvas);
    }

    if (result) {
      console.log('✅ ZXing detected:', result.text);
    } else {
      console.log('❌ ZXing found no barcodes');
    }

    return result;

  } catch (error) {
    console.warn('❌ Detection failed:', error);
    return null;
  }
};