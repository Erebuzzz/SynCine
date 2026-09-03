import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react';

export interface DraggableParticipant {
  id: string;
  name: string;
  stream?: MediaStream;
  isMicActive?: boolean;
  isSelf?: boolean;
  isMirrored?: boolean;
}

interface DraggableTileProps {
  participant: DraggableParticipant;
  initialX?: number;
  initialY?: number;
}

export const DraggableTile: React.FC<DraggableTileProps> = ({
  participant,
  initialX = 20,
  initialY = 20
}) => {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [participant.stream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = participant.isSelf || isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, participant.isSelf]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('input, button')) return;
    isDragging.current = true;
    setIsGrabbing(true);
    const rect = tileRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const width = tileRef.current ? tileRef.current.offsetWidth : 180;
    const height = tileRef.current ? tileRef.current.offsetHeight : 120;
    const newX = Math.max(8, Math.min(window.innerWidth - width - 8, e.clientX - dragOffset.current.x));
    const newY = Math.max(64, Math.min(window.innerHeight - height - 72, e.clientY - dragOffset.current.y));
    setPosition({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    setIsGrabbing(false);
  }, []);

  const hasVideo = participant.stream && participant.stream.getVideoTracks().length > 0;

  return (
    <div
      ref={tileRef}
      className={`fixed w-44 sm:w-64 h-28 sm:h-40 rounded-xl sm:rounded-2xl overflow-hidden z-50 transition-shadow duration-200 ${
        isGrabbing
          ? 'cursor-grabbing shadow-2xl border-[var(--text-tertiary)] ring-1 ring-white/20 dark:ring-white/15 scale-[1.02]'
          : 'cursor-grab shadow-xl'
      } bg-black/[0.03] dark:bg-white/[0.04] backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08]`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isSelf}
          className={`w-full h-full object-cover pointer-events-none ${(participant.isMirrored ?? participant.isSelf) ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/[0.03] dark:bg-white/[0.03] text-[var(--text-tertiary)]">
          <div className="w-12 h-12 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] font-bold text-lg mb-1">
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
            {participant.isSelf ? 'Camera off' : 'Audio Only'}
          </span>
        </div>
      )}

      {/* Bottom controls overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3.5 py-2.5 flex items-center justify-between gap-1.5">
        <span className="text-white text-[11px] sm:text-xs font-semibold truncate max-w-[65px] sm:max-w-[85px]">
          {participant.name}
        </span>
        <div className="flex items-center gap-1">
          {participant.isMicActive ? (
            <span className="p-1 rounded-md bg-[var(--success)]/15 text-[var(--success)] shrink-0">
              <Mic size={11} />
            </span>
          ) : (
            <span className="p-1 rounded-md bg-[var(--destructive)]/15 text-[var(--destructive)] shrink-0">
              <MicOff size={11} />
            </span>
          )}

          {!participant.isSelf && (
            <>
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                aria-label={isMuted ? 'Unmute participant' : 'Mute participant'}
              >
                {isMuted ? <VolumeX size={13} className="text-[var(--destructive)]" /> : <Volume2 size={13} />}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="hidden sm:block w-14 h-1 accent-white/50 cursor-pointer pointer-events-auto"
                title="Participant volume"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
