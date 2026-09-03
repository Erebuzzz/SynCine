import React, { useEffect, useRef, useState } from 'react';

interface AmbilightGlowProps {
  videoElement: HTMLVideoElement | null;
  isEnabled?: boolean;
}

export const AmbilightGlow: React.FC<AmbilightGlowProps> = ({
  videoElement,
  isEnabled = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isEnabled || !videoElement) {
      setIsActive(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    let intervalId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const renderFrame = () => {
      if (
        !isMounted ||
        !videoElement ||
        videoElement.paused ||
        videoElement.ended ||
        videoElement.readyState < 2
      ) {
        if (isActive) setIsActive(false);
        return;
      }

      try {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        if (!isActive) setIsActive(true);
      } catch {
        // Cross-origin or tainted canvas guard
      }
    };

    // Sample video frame every 120ms (efficient ~8fps sampling is plenty for diffused lighting)
    intervalId = setInterval(renderFrame, 120);

    const handlePlay = () => setIsActive(true);
    const handlePause = () => setIsActive(false);

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handlePause);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handlePause);
    };
  }, [videoElement, isEnabled, isActive]);

  if (!isEnabled) return null;

  return (
    <div
      className={`absolute -inset-4 sm:-inset-8 pointer-events-none transition-opacity duration-700 ease-out z-0 overflow-hidden ${
        isActive ? 'opacity-70' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        width={32}
        height={18}
        className="w-full h-full object-cover transform scale-110 filter blur-[40px] sm:blur-[60px] saturate-[1.6] contrast-[1.2]"
      />
    </div>
  );
};
