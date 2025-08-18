import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Camera, X, AlertCircle, CheckCircle, Loader2, Target } from 'lucide-react';
import { detectBarcode, BarcodeProcessor } from '@/lib/barcodeDetector';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

interface AutoBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  scanMode?: 'machine' | 'prize' | 'part' | 'auto'; // Add scan mode for context-aware scanning
}

export const AutoBarcodeScanner: React.FC<AutoBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  scanMode = 'auto' // Default to auto mode for backward compatibility
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
  const processorRef = useRef<BarcodeProcessor | null>(null);
  const { findMachineByBarcode } = useAppContext();
  const { toast } = useToast();

  // Initialize processor
  useEffect(() => {
    processorRef.current = new BarcodeProcessor();

    return () => {
      if (processorRef.current) {
        processorRef.current.destroy();
      }
    };
  }, []);

  // FIX: Context-aware barcode processing
  const determineBarcodeType = (barcode: string): 'machine' | 'prize' | 'part' | 'unknown' => {
    if (barcode.startsWith('MACHINE_') || barcode.startsWith('MAC')) {
      return 'machine';
    } else if (barcode.startsWith('PRIZE_')) {
      return 'prize';
    } else if (barcode.startsWith('PART_')) {
      return 'part';
    }
    return 'unknown';
  };

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !processorRef.current ||
      isProcessing || !scanningActive || !cameraReady) {
      // Continue the loop if we should be scanning
      if (scanningActive && !isProcessing && cameraReady && videoRef.current && canvasRef.current) {
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

      // Set canvas size to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Draw the current video frame to canvas
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      console.log('🎯 Processing frame', scanAttempts + 1, 'size:', videoWidth, 'x', videoHeight);

      // Try barcode detection
      const result = await detectBarcode(imageData, processorRef.current);

      setScanAttempts(prev => prev + 1);

      if (result && result.confidence > 0.1) { // Very low threshold for testing
        console.log('🎯 Barcode detected:', result.text, 'Confidence:', result.confidence, 'Format:', result.format);
        setDetectedCode(result.text);
        setIsProcessing(true);
        setScanningActive(false);

        // FIX: Context-aware barcode handling
        const barcodeType = determineBarcodeType(result.text);
        console.log('🔍 Detected barcode type:', barcodeType, 'Scan mode:', scanMode);

        try {
          if (scanMode === 'machine' || (scanMode === 'auto' && barcodeType === 'machine')) {
            // Handle machine barcode
            const machine = await findMachineByBarcode(result.text);
            console.log('✅ Machine found:', machine.name);

            toast({
              title: 'Machine Found!',
              description: `Found ${machine.name}. Machine selected.`,
            });

            // Stop scanning and close
            stopScanning();
            onClose();

            // Call the onScan callback to select the machine
            setTimeout(() => {
              onScan(result.text);
            }, 100);

          } else if (scanMode === 'prize' || scanMode === 'part' || 
                    (scanMode === 'auto' && (barcodeType === 'prize' || barcodeType === 'part'))) {
            // Handle prize/part barcode - just pass it directly to the handler
            console.log('✅ Prize/Part barcode detected:', result.text);

            toast({
              title: `${barcodeType.charAt(0).toUpperCase() + barcodeType.slice(1)} Barcode Detected!`,
              description: `Found barcode: ${result.text}`,
            });

            // Stop scanning and close
            stopScanning();
            onClose();

            // Call the onScan callback immediately
            setTimeout(() => {
              onScan(result.text);
            }, 100);

          } else {
            // Unknown or mismatched barcode type
            console.log('⚠️ Barcode type mismatch or unknown:', barcodeType, 'Expected:', scanMode);

            toast({
              title: 'Barcode Detected!',
              description: `Found ${barcodeType} barcode: ${result.text}${scanMode !== 'auto' ? ` (Expected ${scanMode})` : ''}`,
              variant: 'default'
            });

            // For unknown types or mismatches, still pass to handler and let it decide
            stopScanning();
            onClose();

            setTimeout(() => {
              onScan(result.text);
            }, 100);
          }

        } catch (lookupError: any) {
          console.error('❌ Barcode lookup failed:', lookupError);

          toast({
            title: 'Barcode Detected!',
            description: `Found barcode: ${result.text} (Not found in database)`,
            variant: 'default'
          });

          // Continue scanning after showing the result
          setTimeout(() => {
            setIsProcessing(false);
            setScanningActive(true);
            setDetectedCode('');
          }, 3000);
        }

        return;
      } else {
        // Log detection attempts every 30 frames to reduce console spam
        if (scanAttempts % 30 === 0) {
          console.log('🔄 Still scanning... attempt', scanAttempts, result ? `(found: ${result.text}, confidence: ${result.confidence})` : '(no detection)');
        }
      }
    } catch (err) {
      console.warn('❌ Barcode detection error:', err);
    }

    // Continue processing next frame
    if (scanningActive) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [isProcessing, scanningActive, cameraReady, findMachineByBarcode, onScan, onClose, toast, scanAttempts, scanMode]);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);
      setDetectedCode('');
      setIsProcessing(false);
      setScanningActive(false);
      setCameraReady(false);
      setScanAttempts(0);

      if (processorRef.current) {
        processorRef.current.reset();
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      console.log('📷 Requesting camera access...');

      // Start with ideal constraints
      const idealConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      };

      let mediaStream: MediaStream;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(idealConstraints);
      } catch (err) {
        console.log('Ideal constraints failed, trying basic constraints...');
        // Fallback to basic constraints
        const basicConstraints = {
          video: {
            facingMode: 'environment'
          }
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
      }

      setStream(mediaStream);
      console.log('✅ Camera stream obtained');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        const handleLoadedMetadata = () => {
          console.log('📹 Video metadata loaded');
          setCameraReady(true);

          videoRef.current?.play().then(() => {
            console.log('▶️ Video playing, starting detection...');
            setScanningActive(true);
            // The useEffect will handle starting the processing loop
          }).catch(err => {
            console.error('Video play error:', err);
            setError('Failed to start video playback');
          });
        };

        // Add event listener
        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });

        // Fallback timeout
        setTimeout(() => {
          if (!cameraReady && videoRef.current && videoRef.current.readyState >= 1) {
            console.log('📹 Fallback: Triggering metadata handler');
            handleLoadedMetadata();
          }
        }, 3000);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let errorMessage = 'Camera access denied or not available';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and refresh the page.';
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
    console.log('🛑 Stopping scanner...');
    setScanningActive(false);
    setCameraReady(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped camera track');
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

    if (processorRef.current) {
      processorRef.current.reset();
    }
  };

  useEffect(() => {
    if (isOpen && !isScanning) {
      console.log('🚀 Dialog opened, starting scanner...');
      startScanning();
    }

    return () => {
      console.log('🧹 Component cleanup...');
      stopScanning();
    };
  }, [isOpen]);

  // Add this useEffect to actually start the processing loop
  useEffect(() => {
    if (scanningActive && cameraReady && !isProcessing) {
      console.log('🎯 Starting processing loop...');
      const startProcessing = () => {
        if (scanningActive && cameraReady && !isProcessing) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
        }
      };

      // Start processing after a short delay
      const timeout = setTimeout(startProcessing, 500);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [scanningActive, cameraReady, isProcessing, processFrame]);

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  // Get scan mode display text
  const getScanModeText = () => {
    switch (scanMode) {
      case 'machine':
        return 'Machine Barcode Scanner';
      case 'prize':
        return 'Prize Barcode Scanner';
      case 'part':
        return 'Part Barcode Scanner';
      default:
        return 'Auto Barcode Scanner';
    }
  };

  const getScanModeDescription = () => {
    switch (scanMode) {
      case 'machine':
        return 'Point your camera at a machine barcode to scan and select the machine';
      case 'prize':
        return 'Point your camera at a prize barcode to scan and select the prize';
      case 'part':
        return 'Point your camera at a part barcode to scan and select the part';
      default:
        return 'Point your camera at any barcode to scan (auto-detects type)';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {getScanModeText()}
          </DialogTitle>
          <DialogDescription>
            {getScanModeDescription()}
          </DialogDescription>
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
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                    Point at barcode
                  </div>
                  {scanMode !== 'auto' && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                      Looking for: {scanMode}
                    </div>
                  )}
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
                    <span className="text-sm font-medium">Processing barcode...</span>
                    <span className="text-xs text-gray-500 font-mono break-all">{detectedCode}</span>
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
                {isProcessing ? 'Processing barcode...' :
                  scanningActive ? `Scanning for barcodes... (${scanAttempts} attempts)` :
                    isScanning ? 'Starting camera...' : 'Camera inactive'}
              </div>
              <div className="text-xs text-gray-500">
                Hold steady and ensure good lighting for best results
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-red-700 block">{error}</span>
                  <Button
                    onClick={startScanning}
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-700 border-red-300 hover:bg-red-50"
                    disabled={isScanning}
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Retry Camera
                  </Button>
                </div>
              </div>
            )}

            {!error && !isScanning && (
              <Button
                onClick={startScanning}
                className="w-full"
                disabled={isScanning}
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default AutoBarcodeScanner;