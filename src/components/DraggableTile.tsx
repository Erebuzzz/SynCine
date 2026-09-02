import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { LiquidMicIcon, LiquidMicOffIcon } from './icons/SynIcons';

export interface DraggableTileProps {
  id: string;
  name: string;
  stream: MediaStream;
  volume: number;
  isMuted?: boolean;
  onVolumeChange: (val: number) => void;
  onToggleMute?: () => void;
}

export const DraggableTile: React.FC<DraggableTileProps> = ({
  name,
  stream,
  volume,
  isMuted = false,
  onVolumeChange,
  onToggleMute
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [position, setPosition] = useState({ x: 40, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const hasAudioTrack = stream.getAudioTracks().length > 0;
  const hasVideoTrack = stream.getVideoTracks().length > 0;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [stream, volume, isMuted]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input, button')) return;

    setIsDragging(true);
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const tileWidth = 250;
    const tileHeight = 150;
    const padding = 12;

    const nextX = Math.max(padding, Math.min(window.innerWidth - tileWidth - padding, e.clientX - offset.current.x));
    const nextY = Math.max(60, Math.min(window.innerHeight - tileHeight - padding, e.clientY - offset.current.y));

    setPosition({ x: nextX, y: nextY });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture release exceptions
    }
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
        userSelect: 'none'
      }}
      className={`fixed top-0 left-0 w-64 h-40 rounded-3xl bg-[rgba(10,16,34,0.78)] backdrop-blur-2xl border border-white/[0.16] shadow-[0_20px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.22)] overflow-hidden cursor-grab active:cursor-grabbing z-50 transition-shadow duration-200 hover:border-indigo-400/60 ${
        isDragging ? 'shadow-2xl scale-[1.02] border-indigo-400 ring-2 ring-indigo-500/40' : ''
      }`}
    >
      {/* Specular Bevel Highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-10" />

      {hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/90 to-black/95 text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-900/60 to-pink-900/40 border border-white/15 flex items-center justify-center text-indigo-200 font-black text-lg mb-1 shadow-lg">
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Acoustic Audio Channel</span>
        </div>
      )}

      {/* Floating Bottom Control Bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-3.5 py-2.5 flex items-center justify-between gap-1.5 backdrop-blur-md">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-white text-xs font-bold truncate max-w-[85px]" title={name}>
            {name}
          </span>
          {hasAudioTrack ? (
            <div className="p-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 shrink-0">
              <LiquidMicIcon size={12} className="text-emerald-400" />
            </div>
          ) : (
            <div className="p-1 rounded-md bg-rose-500/20 border border-rose-500/30 shrink-0">
              <LiquidMicOffIcon size={12} className="text-rose-400" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute?.();
            }}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX size={13} className="text-rose-400" /> : <Volume2 size={13} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              e.stopPropagation();
              onVolumeChange(parseFloat(e.target.value));
            }}
            className="w-16 h-1 accent-indigo-400 cursor-pointer pointer-events-auto"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
};
