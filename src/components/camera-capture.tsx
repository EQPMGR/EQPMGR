'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from './ui/dialog';
import Image from 'next/image';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  children: React.ReactNode;
}

export function CameraCapture({ onCapture, children }: CameraCaptureProps) {
  const [open, setOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Cleanup function to stop the camera stream when the component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getCameraPermission = async () => {
    if (hasCameraPermission === true) return;

    // Reset state for new attempt
    setHasCameraPermission(null); 

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setHasCameraPermission(true);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setCapturedImage(null); // Reset on open
      getCameraPermission();
    } else {
      stopCameraStream();
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        stopCameraStream();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    getCameraPermission();
  };
  
  const handleSave = () => {
      if (capturedImage) {
          onCapture(capturedImage);
          handleOpenChange(false);
      }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Take a Photo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
            <div className="w-full relative bg-muted rounded-md overflow-hidden aspect-video">
                {capturedImage ? (
                    <Image src={capturedImage} alt="Captured" layout="fill" objectFit="cover" />
                ) : (
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                )}
                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
                         <Alert variant="destructive" className="w-full max-w-sm">
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>
                                Please allow camera access to use this feature.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                 {hasCameraPermission === null && !capturedImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p>Starting camera...</p>
                    </div>
                )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
        </div>
        <DialogFooter>
            {capturedImage ? (
                <>
                    <Button onClick={handleRetake} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retake
                    </Button>
                    <Button onClick={handleSave}>
                        <Check className="mr-2 h-4 w-4" />
                        Use Photo
                    </Button>
                </>
            ) : (
                <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                </DialogClose>
            )}
            {!capturedImage &&
                <Button onClick={handleCapture} disabled={hasCameraPermission !== true}>
                    <Camera className="mr-2 h-4 w-4" />
                    Capture
                </Button>
            }
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
