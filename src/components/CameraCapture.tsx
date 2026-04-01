import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

export interface CameraCaptureRef {
  capturePhoto: () => void;
}

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  hideButton?: boolean;
}

const CameraCapture = forwardRef<CameraCaptureRef, CameraCaptureProps>(({ onCapture, hideButton }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Clear video buffer
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera(); // Stop any existing stream first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Trình duyệt không hỗ trợ camera.');
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true, // Cấu hình linh hoạt nhất
      });
      
      if (!isMounted.current) {
        // Component unmounted while waiting for camera
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      console.log('Camera stream initialized:', mediaStream);
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error('Video play error:', e);
          }
        });
      }
      setError(null);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      if (err.name === 'NotAllowedError') {
        setError('Không thể truy cập camera. Vui lòng cấp quyền.');
      } else if (err.name === 'NotFoundError') {
        setError('Không tìm thấy camera.');
      } else {
        setError('Lỗi luồng video: ' + err.message);
      }
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Resize image to max 300px
        const MAX_DIMENSION = 300;
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, width, height);

        // Get base64 image data (compressed JPEG)
        const imageData = canvas.toDataURL('image/jpeg', 0.6);
        stopCamera(); // Stop camera immediately after capture
        onCapture(imageData);
      }
    }
  }, [onCapture, stopCamera]);

  useImperativeHandle(ref, () => ({
    capturePhoto
  }));

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-4">
      {error ? (
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
          {error}
          <button
            onClick={startCamera}
            className="mt-2 flex items-center justify-center w-full px-4 py-2 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
          </button>
        </div>
      ) : (
        <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            controls={false}
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {!hideButton && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <button
                onClick={capturePhoto}
                className="flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-xl border-4 border-amber-500 hover:bg-amber-50 active:scale-95 transition-transform"
              >
                <Camera className="w-8 h-8 text-amber-600" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CameraCapture.displayName = 'CameraCapture';

export default CameraCapture;
