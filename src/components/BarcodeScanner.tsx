import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Scan, AlertCircle, X, Camera, CheckCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { detectBarcode, BarcodeProcessor } from '@/lib/barcodeDetector';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onScan?: (barcode: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  isOpen = false, 
  onClose, 
  onScan 
}) => {
  const { findMachineByBarcode, setCurrentView, setSelectedMachineForHistory } = useAppContext();
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<BarcodeProcessor>(new BarcodeProcessor());
  const scanningRef = useRef<boolean>(false);
  const animationRef = useRef<number>();
  const lastScanRef = useRef<string>('');
  const scanAttempts = useRef<number>(0);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleScanBarcode = async (barcode: string) => {
    if (isLoading || barcode === lastScanRef.current) return;
    
    try {
      setIsLoading(true);
      setError('');
      setScanResult(barcode);
      lastScanRef.current = barcode;
      
      console.log('🔍 Processing barcode:', barcode);
      
      const machine = await findMachineByBarcode(barcode);
      
      console.log('✅ Machine found:', machine.name);
      
      setSelectedMachineForHistory(machine);
      setCurrentView('machine-profile');
      
      toast({
        title: 'Machine Found!',
        description: `Loaded ${machine.name}`,
      });
      
      handleClose();
      
      if (onScan) {
        onScan(barcode);
      }
    } catch (err: any) {
      console.error('❌ Scan error:', err);
      setError(err.message || 'Failed to process barcode');
      toast({
        title: 'Scan Error',
        description: err.message || 'No machine found for this barcode',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current || scanningRef.current) return;
    
    setIsScanning(true);
    scanningRef.current = true;
    scanAttempts.current = 0;
    
    const scanFrame = async () => {
      if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      
      if (!processorRef.current.shouldProcess()) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const result = await detectBarcode(imageData);
        
        scanAttempts.current++;
        setScanCount(scanAttempts.current);
        
        if (result && result.confidence > 0.5) {
          console.log('📱 Barcode detected:', result.text, 'Confidence:', result.confidence);
          scanningRef.current = false;
          setIsScanning(false);
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          handleScanBarcode(result.text);
          return;
        }
        
        // Continue scanning
        animationRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        console.error('Frame processing error:', err);
        animationRef.current = requestAnimationFrame(scanFrame);
      }
    };
    
    animationRef.current = requestAnimationFrame(scanFrame);
  };

  const stopScanning = () => {
    scanningRef.current = false;
    setIsScanning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    processorRef.current.reset();
  };

  const startCamera = async () => {
    try {
      setError('');
      setShowCamera(true);
      setCameraReady(false);
      setScanCount(0);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }
      
      console.log('📷 Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      });
      
      console.log('✅ Camera stream obtained');
      streamRef.current = stream;
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        
        video.onloadedmetadata = () => {
          console.log('📹 Video metadata loaded, size:', video.videoWidth, 'x', video.videoHeight);
          setCameraReady(true);
          setTimeout(() => startScanning(), 500);
        };
        
        await video.play();
        console.log('▶️ Video playing successfully');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let errorMessage = 'Camera access failed';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      setError(errorMessage);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    stopScanning();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped camera track');
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCameraReady(false);
    setScanCount(0);
  };

  const handleClose = () => {
    stopCamera();
    setError('');
    setScanResult('');
    lastScanRef.current = '';
    if (onClose) {
      onClose();
    }
  };

  const ScannerContent = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Barcode Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showCamera ? (
          <>
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Scan className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Scan Machine Barcode</h3>
              <p className="text-sm text-gray-600 mb-4">
                Point your camera at a machine barcode to load that machine
              </p>
            </div>

            <Button onClick={startCamera} className="w-full h-16">
              <div className="text-center">
                <Camera className="h-6 w-6 mx-auto mb-1" />
                <div className="font-medium">Start Camera</div>
              </div>
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{height: '400px'}}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Button onClick={stopCamera} variant="secondary" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {cameraReady && (
                <div className="absolute bottom-2 left-2 flex gap-2">
                  <div className={`px-2 py-1 rounded text-xs text-white ${
                    isScanning ? 'bg-green-500' : 'bg-gray-500'
                  }`}>
                    ● {isScanning ? 'SCANNING' : 'READY'}
                  </div>
                  <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                    Attempts: {scanCount}
                  </div>
                </div>
              )}
              {cameraReady && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-32 border-2 border-red-500 border-dashed opacity-50"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                    Point camera at barcode
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center">
            <Badge variant="secondary">Processing barcode...</Badge>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {scanResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Barcode Scanned:</span>
            </div>
            <p className="font-mono text-sm text-green-700">{scanResult}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Scan Machine Barcode</DialogTitle>
          </DialogHeader>
          <ScannerContent />
        </DialogContent>
      </Dialog>
    );
  }

  return <ScannerContent />;
};

export default BarcodeScanner;