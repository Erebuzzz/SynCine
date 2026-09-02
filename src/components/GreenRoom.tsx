import React, { useState, useEffect, useRef } from 'react';
import { SynLogo, LiquidMicIcon, LiquidMicOffIcon, ScreenCastIcon } from './icons/SynIcons';
import { Video, VideoOff, Copy, CheckCircle2, ArrowRight, Users, X } from 'lucide-react';

interface GreenRoomProps {
  roomName: string;
  roomId: string;
  initialUserName: string;
  mediaMode: 'screen' | 'local_file';
  isHost: boolean;
  onJoin: (userName: string, micEnabled: boolean, videoEnabled: boolean, presentImmediately: boolean) => void;
  onCancel: () => void;
}

export const GreenRoom: React.FC<GreenRoomProps> = ({
  roomName,
  roomId,
  initialUserName,
  mediaMode,
  isHost,
  onJoin,
  onCancel
}) => {
  const [userName, setUserName] = useState(initialUserName);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    async function setupPreview() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoOn ? { width: 640, height: 360 } : false,
          audio: true
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setPreviewStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }

        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioMeter = () => {
            if (!analyserRef.current || !isMicOn) {
              setAudioLevel(0);
            } else {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            }
            animFrameRef.current = requestAnimationFrame(updateAudioMeter);
          };
          updateAudioMeter();
        } catch {
        }
      } catch (err) {
        console.warn('Media preview unavailable:', err);
      }
    }

    setupPreview();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isVideoOn]);

  useEffect(() => {
    if (previewStream) {
      previewStream.getAudioTracks().forEach((t) => {
        t.enabled = isMicOn;
      });
    }
  }, [isMicOn, previewStream]);

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleJoinClick = (present: boolean) => {
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
    }
    onJoin(userName.trim() || 'Guest', isMicOn, isVideoOn, present);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between font-sans select-none z-20 architectural-grid">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between py-3.5 px-6 sm:px-12 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <SynLogo size={30} className="shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="text-[var(--text-primary)] font-bold text-base tracking-tight leading-none">SynCine</span>
            <span className="font-mono text-[10px] tracking-wider text-[var(--text-tertiary)] uppercase hidden sm:inline">
              // PRE-MEETING STAGING
            </span>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
        >
          <X size={14} />
          <span>LEAVE</span>
        </button>
      </header>

      {/* Center Device Staging Stage */}
      <main className="w-full max-w-5xl mx-auto my-auto p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Viewfinder Camera & Mic Window */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full aspect-video rounded-2xl relative overflow-hidden bg-black flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1] shadow-2xl">
            {/* Viewfinder Architectural Crosshairs (Pacome / Kenichi inspired) */}
            <div className="absolute top-4 left-4 font-mono text-[10px] text-white/30 pointer-events-none select-none">
              + [01_CAM]
            </div>
            <div className="absolute top-4 right-4 font-mono text-[10px] text-white/30 pointer-events-none select-none">
              [REC_READY] +
            </div>
            <div className="absolute bottom-16 left-4 font-mono text-[10px] text-white/30 pointer-events-none select-none">
              + [1080P_60FPS]
            </div>

            {isVideoOn && previewStream?.getVideoTracks().length ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[var(--text-secondary)] p-6">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 font-mono font-bold text-2xl mb-3">
                  {userName ? userName.charAt(0).toUpperCase() : 'C'}
                </div>
                <span className="font-mono text-xs text-white/40 tracking-wider">CAMERA MUTED</span>
              </div>
            )}

            {/* Bottom In-Tile Controls */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                {/* Microphone Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-2.5 rounded-xl transition cursor-pointer ${
                    isMicOn
                      ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                      : 'bg-[var(--destructive)]/20 text-[var(--destructive)] border border-[var(--destructive)]/30'
                  }`}
                  title={isMicOn ? 'Turn mic off' : 'Turn mic on'}
                >
                  {isMicOn ? <LiquidMicIcon size={16} /> : <LiquidMicOffIcon size={16} />}
                </button>

                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-2.5 rounded-xl transition cursor-pointer ${
                    isVideoOn
                      ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                      : 'bg-[var(--destructive)]/20 text-[var(--destructive)] border border-[var(--destructive)]/30'
                  }`}
                  title={isVideoOn ? 'Turn camera off' : 'Turn camera on'}
                >
                  {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
              </div>

              {/* Monospace VU Decibel Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-white/70">
                <div className="w-14 h-1 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-75 rounded-full"
                    style={{ width: `${isMicOn ? audioLevel : 0}%` }}
                  />
                </div>
                <span>{isMicOn ? `VU: ${audioLevel}%` : 'MUTED'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Watchroom Joining Panel */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="p-6 sm:p-8 space-y-6 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl backdrop-blur-xl">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-[10px] font-mono tracking-wider text-[var(--text-secondary)] mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                <span>SESSION READY</span>
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                {roomName}
              </h2>
              <p className="font-mono text-[11px] text-[var(--text-tertiary)] mt-1">
                PIPELINE: {mediaMode === 'screen' ? 'SCREEN CAST (H.264)' : 'LOCAL FILE SYNC'} // {isHost ? 'HOST' : 'PEER'}
              </p>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="block font-mono text-[11px] text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                [01] Confirm Display Name
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                maxLength={32}
                className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-xs rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
              />
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => handleJoinClick(false)}
                disabled={!userName.trim()}
                className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black font-semibold text-xs rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
              >
                <span>ENTER STAGE</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>

              {mediaMode === 'screen' && isHost && (
                <button
                  type="button"
                  onClick={() => handleJoinClick(true)}
                  disabled={!userName.trim()}
                  className="w-full py-3 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono text-xs rounded-xl border border-black/[0.06] dark:border-white/[0.08] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ScreenCastIcon size={15} />
                  <span>PRESENT SCREEN ON ENTRY</span>
                </button>
              )}
            </div>

            {/* Invite Link */}
            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between font-mono text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Users size={13} />
                <span>MAX 4 PEERS</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 hover-underline text-[var(--text-primary)] transition cursor-pointer"
              >
                {copiedLink ? <CheckCircle2 size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
                <span>{copiedLink ? 'LINK COPIED' : 'COPY INVITE LINK'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full mx-auto py-4 text-center font-mono text-[11px] text-[var(--text-tertiary)]">
        <span>ENCRYPTED SRTP MEDIA CHANNELS // ZERO SERVER STORAGE</span>
      </footer>
    </div>
  );
};
