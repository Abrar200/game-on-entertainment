import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface CameraPreviewProps {
  isActive: boolean;
  onFrame?: (canvas: HTMLCanvasElement) => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ 
  isActive, 
  onFrame 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [videoReady, setVideoReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError('');
      setVideoReady(false);
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Request camera access with fallback options
      let stream: MediaStream;
      try {
        // Try rear camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { exact: 'environment' },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: false
        });
      } catch {
        try {
          // Fallback to any rear camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'environment',
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
            audio: false
          });
        } catch {
          // Final fallback to any camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
            audio: false
          });
        }
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Configure video element for mobile compatibility
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x5-playsinline', 'true');
        video.muted = true;
        video.autoplay = true;
        
        // Set stream and wait for it to load
        video.srcObject = stream;
        
        // Wait for video to be ready
        video.onloadedmetadata = () => {
          video.play().then(() => {
            setVideoReady(true);
          }).catch((playError) => {
            console.error('Video play failed:', playError);
            setError('Failed to start video playback');
          });
        };
        
        video.onerror = () => {
          setError('Video element error');
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let errorMsg = 'Camera access failed';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please allow camera access and refresh.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMsg = 'Camera not supported in this browser.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is being used by another application.';
      }
      
      setError(errorMsg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setVideoReady(false);
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive]);

  // Frame capture for barcode scanning
  useEffect(() => {
    let animationFrame: number;
    
    const captureFrame = () => {
      if (!isActive || !videoReady || !onFrame) return;
      
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx && video.readyState >= 2) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          // Draw the video frame normally without flipping
          ctx.drawImage(video, 0, 0);
          onFrame(canvas);
        }
      }
      
      if (isActive && videoReady) {
        animationFrame = requestAnimationFrame(captureFrame);
      }
    };
    
    if (isActive && videoReady && onFrame) {
      captureFrame();
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isActive, videoReady, onFrame]);

  if (error) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center p-4 max-w-sm">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={startCamera} 
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center text-gray-500">
          <Camera className="h-12 w-12 mx-auto mb-2" />
          <p>Camera preview inactive</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          muted
          autoPlay
          className="w-full h-full object-cover"
        />
        
        {!videoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="text-center text-white">
              <Camera className="h-12 w-12 mx-auto mb-2 animate-pulse" />
              <p className="text-sm">Initializing camera...</p>
              <p className="text-xs mt-1 opacity-75">Please wait</p>
            </div>
          </div>
        )}
        
        {videoReady && (
          <div className="absolute bottom-2 left-2 bg-green-600 bg-opacity-90 text-white px-2 py-1 rounded text-xs font-medium">
            📹 LIVE
          </div>
        )}
        
        {/* Scanning overlay */}
        {videoReady && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white border-opacity-50 rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>
            </div>
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-xs">
              Position barcode in frame
            </div>
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraPreview;