import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeSyncPlayerProps {
  videoId: string;
  isHost: boolean;
  syncState?: {
    currentTime: number;
    isPlaying: boolean;
    timestamp: number;
  } | null;
  onSyncAction?: (state: { currentTime: number; isPlaying: boolean }) => void;
}

export const YouTubeSyncPlayer: React.FC<YouTubeSyncPlayerProps> = ({
  videoId,
  isHost,
  syncState,
  onSyncAction
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const isSeekingRef = useRef(false);
  const lastReportedTimeRef = useRef(0);

  // Initialize YouTube IFrame API
  useEffect(() => {
    let isCancelled = false;

    function initPlayer() {
      if (isCancelled || !containerRef.current || !window.YT || !window.YT.Player) return;

      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: isHost ? 1 : 0, // Host uses native controls; guests are synchronized
          disablekb: isHost ? 0 : 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
          enablejsapi: 1
        },
        events: {
          onReady: () => {
            if (isCancelled) return;
            setIsReady(true);
          },
          onStateChange: (event: any) => {
            if (isCancelled) return;
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              const curTime = event.target.getCurrentTime() || 0;
              lastReportedTimeRef.current = curTime;
              if (isHost && onSyncAction && !isSeekingRef.current) {
                onSyncAction({
                  currentTime: curTime,
                  isPlaying: true
                });
              }
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              const curTime = event.target.getCurrentTime() || 0;
              lastReportedTimeRef.current = curTime;
              if (isHost && onSyncAction && !isSeekingRef.current) {
                onSyncAction({
                  currentTime: curTime,
                  isPlaying: false
                });
              }
            }
          }
        }
      });
    }

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => initPlayer();
      document.body.appendChild(tag);
    } else {
      initPlayer();
    }

    return () => {
      isCancelled = true;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, isHost]);

  // Update playback time ticker and detect host native seeks
  useEffect(() => {
    if (!isReady || !isPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const now = playerRef.current.getCurrentTime() || 0;

        // Detect if the host scrubbed using YouTube's native timeline controls
        if (isHost && onSyncAction && !isSeekingRef.current) {
          const expected = lastReportedTimeRef.current + 0.5;
          if (Math.abs(now - expected) > 1.5) {
            lastReportedTimeRef.current = now;
            onSyncAction({
              currentTime: now,
              isPlaying: true
            });
          } else {
            lastReportedTimeRef.current = now;
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isReady, isPlaying, isHost, onSyncAction]);

  // Handle peer synchronization events (Guest side or non-originating peer)
  useEffect(() => {
    if (!isReady || !playerRef.current || !syncState) return;

    const now = Date.now();
    const elapsedSinceSync = syncState.isPlaying ? (now - syncState.timestamp) / 1000 : 0;
    const targetTime = syncState.currentTime + elapsedSinceSync;
    const current = playerRef.current.getCurrentTime() || 0;
    const drift = Math.abs(current - targetTime);

    // If drift exceeds 1.5 seconds, seek
    if (drift > 1.5) {
      playerRef.current.seekTo(targetTime, true);
    }

    if (syncState.isPlaying && !isPlaying) {
      playerRef.current.playVideo();
      setIsPlaying(true);
    } else if (!syncState.isPlaying && isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    }
  }, [syncState, isReady]);


  // Volume handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(val);
      if (val > 0 && isMuted) {
        setIsMuted(false);
        playerRef.current.unMute();
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden select-none group">
      {/* YouTube Player Container */}
      <div className="w-full h-full flex items-center justify-center">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Sync Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white/80 pointer-events-none">
        <Sparkles size={13} className="text-[var(--accent)]" />
        <span className="font-semibold text-[11px]">YouTube CDN Synchronized</span>
      </div>

      {/* Guest Local Volume Pill (Host controls playback and timeline via YouTube native controls) */}
      {!isHost && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 text-white/90 shadow-lg select-none">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 h-1 bg-white/20 rounded appearance-none cursor-pointer accent-[var(--accent)]"
            title="Local Volume"
          />
        </div>
      )}
    </div>
  );
};
