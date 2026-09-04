import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Sparkles } from 'lucide-react';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const isSeekingRef = useRef(false);

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
          controls: isHost ? 1 : 0, // Guest controls are synchronized via our cinema UI
          disablekb: isHost ? 0 : 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
          enablejsapi: 1
        },
        events: {
          onReady: (event: any) => {
            if (isCancelled) return;
            setIsReady(true);
            setDuration(event.target.getDuration() || 0);
          },
          onStateChange: (event: any) => {
            if (isCancelled) return;
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              if (isHost && onSyncAction && !isSeekingRef.current) {
                onSyncAction({
                  currentTime: event.target.getCurrentTime() || 0,
                  isPlaying: true
                });
              }
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              if (isHost && onSyncAction && !isSeekingRef.current) {
                onSyncAction({
                  currentTime: event.target.getCurrentTime() || 0,
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

  // Update playback time ticker
  useEffect(() => {
    if (!isReady || !isPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        if (!duration && typeof playerRef.current.getDuration === 'function') {
          setDuration(playerRef.current.getDuration() || 0);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isReady, isPlaying, duration]);

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

  // Host playback toggle
  const togglePlayPause = useCallback(() => {
    if (!isReady || !playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      onSyncAction?.({ currentTime, isPlaying: false });
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      onSyncAction?.({ currentTime, isPlaying: true });
    }
  }, [isReady, isPlaying, currentTime, onSyncAction]);

  // Seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (!isReady || !playerRef.current) return;

    isSeekingRef.current = true;
    playerRef.current.seekTo(seekTime, true);

    if (isHost) {
      onSyncAction?.({ currentTime: seekTime, isPlaying });
    }

    setTimeout(() => {
      isSeekingRef.current = false;
    }, 200);
  };

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

      {/* Custom Cinema Player Control Bar */}
      <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {/* Scrubber Range Bar */}
        <div className="w-full flex items-center gap-2 text-[11px] text-white/70 font-mono">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            disabled={!isHost}
            className="flex-1 h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed transition"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Dock Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isHost && (
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
            )}

            <button
              type="button"
              onClick={toggleMute}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-white/20 rounded appearance-none cursor-pointer accent-[var(--accent)]"
            />
          </div>

          <div className="text-[11px] text-white/50">
            {isHost ? 'Host Controls Active' : 'Synced with Host'}
          </div>
        </div>
      </div>
    </div>
  );
};
