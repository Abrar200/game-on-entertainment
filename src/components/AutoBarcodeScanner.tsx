import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, AlertCircle, CheckCircle, Loader2, Target } from 'lucide-react';
import { detectBarcode, BarcodeProcessor } from '@/lib/barcodeDetector';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

interface AutoBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const AutoBarcodeScanner: React.FC<AutoBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detectedCode, setDetectedCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const processorRef = useRef(new BarcodeProcessor());
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { findMachineByBarcode, setCurrentView } = useAppContext();
  const { toast } = useToast();

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !scanningActive || !cameraReady) {
      if (scanningActive && !isProcessing && cameraReady) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    if (!processorRef.current.shouldProcess()) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      const videoWidth = video.videoWidth || video.clientWidth;
      const videoHeight = video.videoHeight || video.clientHeight;
      
      if (videoWidth === 0 || videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      enhanceImageForBarcode(imageData);
      ctx.putImageData(imageData, 0, 0);
      
      const enhancedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = await detectBarcode(enhancedImageData);
      
      setScanAttempts(prev => prev + 1);
      
      if (result && result.confidence > 0.6) {
        console.log('🎯 Barcode detected:', result.text);
        setDetectedCode(result.text);
        setIsProcessing(true);
        setScanningActive(false);
        
        if (detectionTimeoutRef.current) {
          clearTimeout(detectionTimeoutRef.current);
        }
        
        try {
          const machine = await findMachineByBarcode(result.text);
          console.log('✅ Machine found:', machine.name);
          
          toast({
            title: 'Machine Found!',
            description: `Found ${machine.name}. Loading machine profile...`,
          });
          
          stopScanning();
          onClose();
          setCurrentView('machines');
          
          setTimeout(() => {
            onScan(result.text);
          }, 100);
          
        } catch (machineError: any) {
          console.error('❌ Machine lookup failed:', machineError);
          toast({
            title: 'Machine Not Found',
            description: machineError.message || 'Could not find machine for this barcode',
            variant: 'destructive'
          });
          
          setIsProcessing(false);
          setScanningActive(true);
          setDetectedCode('');
        }
        
        return;
      }
    } catch (err) {
      console.warn('Barcode detection error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isProcessing, scanningActive, cameraReady, findMachineByBarcode, setCurrentView, onScan, onClose, toast]);

  const enhanceImageForBarcode = (imageData: ImageData) => {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const enhanced = gray > 128 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
      
      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    }
  };

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);
      setDetectedCode('');
      setIsProcessing(false);
      setScanningActive(false);
      setCameraReady(false);
      setScanAttempts(0);
      processorRef.current.reset();
      
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        const handleLoadedMetadata = () => {
          setCameraReady(true);
          videoRef.current?.play().then(() => {
            setTimeout(() => {
              setScanningActive(true);
              animationFrameRef.current = requestAnimationFrame(processFrame);
            }, 1000);
          }).catch(err => {
            setError('Failed to start video playback');
            console.error('Video play error:', err);
          });
        };
        
        videoRef.current.onloadedmetadata = handleLoadedMetadata;
        
        setTimeout(() => {
          if (!cameraReady && videoRef.current) {
            handleLoadedMetadata();
          }
        }, 3000);
      }
    } catch (err: any) {
      let errorMessage = 'Camera access denied or not available';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.';
      }
      setError(errorMessage);
      setIsScanning(false);
      setCameraReady(false);
    }
  };

  const stopScanning = () => {
    setScanningActive(false);
    setCameraReady(false);
    
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
      detectionTimeoutRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setDetectedCode('');
    setIsProcessing(false);
    setScanAttempts(0);
    processorRef.current.reset();
  };

  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Auto Barcode Scanner
          </DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden h-64">
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
              
              {isScanning && !cameraReady && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-sm font-medium">Starting camera...</span>
                  </div>
                </div>
              )}
              
              {scanningActive && cameraReady && (
                <div className="absolute inset-4">
                  <div className="w-full h-full border-2 border-green-500 rounded-lg animate-pulse" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    Scans: {scanAttempts}
                  </div>
                </div>
              )}
              
              {detectedCode && (
                <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 animate-bounce">
                  <CheckCircle className="h-4 w-4" />
                  Code detected!
                </div>
              )}
              
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    <span className="text-sm font-medium">Finding machine...</span>
                    <span className="text-xs text-gray-500">{detectedCode}</span>
                  </div>
                </div>
              )}
              
              <Button
                onClick={handleClose}
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-sm font-medium">
                {isProcessing ? 'Finding machine for barcode...' :
                 scanningActive ? `Scanning for barcodes... (${scanAttempts} attempts)` :
                 isScanning ? 'Starting camera...' : 'Camera inactive'}
              </div>
              <div className="text-xs text-gray-500">
                Point camera at barcode for automatic detection
              </div>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            
            {error && (
              <Button 
                onClick={startScanning} 
                className="w-full"
                disabled={isScanning}
              >
                <Camera className="h-4 w-4 mr-2" />
                Retry Camera
              </Button>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default AutoBarcodeScanner;