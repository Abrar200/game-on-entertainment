import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, AlertCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface SimpleBarcodeScanner {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const SimpleBarcodeScanner: React.FC<SimpleBarcodeScanner> = ({
  isOpen,
  onClose,
  onScan
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      setError('');
      setIsScanning(true);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError('Camera access denied or not available');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const simulateScan = () => {
    const mockBarcode = `MACHINE_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    onScan(mockBarcode);
    stopCamera();
    onClose();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Machine Barcode</DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            {!isScanning ? (
              <div className="text-center space-y-4">
                <Camera className="h-16 w-16 mx-auto text-gray-400" />
                <p className="text-sm text-gray-600">Click to start camera</p>
                <Button onClick={startCamera} className="w-full">
                  Start Camera
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden h-64">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <Button
                    onClick={stopCamera}
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={simulateScan} className="w-full">
                  Simulate Scan
                </Button>
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleBarcodeScanner;