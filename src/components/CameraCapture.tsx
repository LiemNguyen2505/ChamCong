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
  const requestRef = useRef(0);

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
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
      }
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Clear video buffer
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera(); // Stop any existing stream first
      
      const currentRequest = ++requestRef.current;

      console.log('Starting camera access. Secure Context:', window.isSecureContext);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Trình duyệt không hỗ trợ hoặc chặn truy cập camera (yêu cầu HTTPS).');
        return;
      }

      // Try with specific constraints first
      let mediaStream: MediaStream;
      try {
        const mediaConstraints = {
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      } catch (innerErr) {
        console.warn('Initial camera constraints failed, trying fallback:', innerErr);
        // Fallback to simplest constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      if (!isMounted.current || currentRequest !== requestRef.current) {
        // Component unmounted while waiting for camera, or a new request was made
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
      console.warn('Camera warning:', err.message);
      const errorMsg = err.message || '';
      if (err.name === 'NotAllowedError' || errorMsg.includes('Permission denied')) {
        const isIframe = window.self !== window.top;
        if (isIframe) {
          setError('Không thể truy cập camera. Vui lòng MỞ ỨNG DỤNG BẰNG THẺ MỚI (Open App in New Tab ở góc trên bên phải màn hình nếu có) hoặc cấp quyền camera trong cài đặt trình duyệt và thử lại.');
        } else {
          setError('Không thể truy cập camera. Vui lòng cấp quyền camera trong cài đặt trình duyệt và thử lại.');
        }
      } else if (err.name === 'NotFoundError') {
        setError('Không tìm thấy thiết bị camera.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera đang được sử dụng bởi ứng dụng khác.');
      } else {
        setError('Lỗi kết nối camera: ' + (err.message || 'Hệ thống từ chối truy cập.'));
      }
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !videoRef.current.videoWidth) {
      onCapture('');
      return;
    }
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
