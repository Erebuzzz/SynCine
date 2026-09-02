import React, { useState, useEffect, useRef } from 'react';
import { SynLogo, LiquidMicIcon, LiquidMicOffIcon, ScreenCastIcon } from './icons/SynIcons';
import { Video, VideoOff, Copy, CheckCircle2, ArrowRight, Users } from 'lucide-react';

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
        console.warn('Media preview unavailable (camera/mic permission denied):', err);
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
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 font-sans select-none z-20">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between py-3 px-5 sm:px-8 bg-white/90 dark:bg-black/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <SynLogo size={32} className="shrink-0" />
          <div className="flex flex-col">
            <span className="text-[var(--text-primary)] font-bold text-base tracking-tight leading-none">SynCine</span>
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Pre-Meeting Device Check</span>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
        >
          Cancel
        </button>
      </header>

      {/* Center Stage Container */}
      <main className="w-full max-w-5xl mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Device Preview Window */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full aspect-video rounded-2xl relative overflow-hidden bg-black flex items-center justify-center shadow-none border border-black/[0.08] dark:border-white/[0.08]">
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
                <div className="w-20 h-20 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-[var(--text-tertiary)] font-bold text-3xl mb-3">
                  {userName.charAt(0).toUpperCase() || 'C'}
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">Camera is off</span>
              </div>
            )}

            {/* Bottom In-Tile Device Controls */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                {/* Microphone Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-3 rounded-xl transition cursor-pointer ${
                    isMicOn
                      ? 'bg-black/[0.04] dark:bg-white/[0.08] text-[var(--text-primary)] border border-black/[0.08] dark:border-white/[0.1]'
                      : 'bg-[var(--destructive)]/15 text-[var(--destructive)]'
                  }`}
                  title={isMicOn ? 'Turn mic off' : 'Turn mic on'}
                >
                  {isMicOn ? <LiquidMicIcon size={18} /> : <LiquidMicOffIcon size={18} />}
                </button>

                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-3 rounded-xl transition cursor-pointer ${
                    isVideoOn
                      ? 'bg-black/[0.04] dark:bg-white/[0.08] text-[var(--text-primary)] border border-black/[0.08] dark:border-white/[0.1]'
                      : 'bg-[var(--destructive)]/15 text-[var(--destructive)]'
                  }`}
                  title={isVideoOn ? 'Turn camera off' : 'Turn camera on'}
                >
                  {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
              </div>

              {/* Live Audio Level Indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08]">
                <div className="w-16 h-1.5 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--text-secondary)] transition-all duration-75 rounded-full"
                    style={{ width: `${isMicOn ? audioLevel : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] font-semibold">
                  {isMicOn ? (audioLevel > 10 ? 'Audio OK' : 'Mic Active') : 'Muted'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Meeting Details & Join Action Card */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="p-6 sm:p-8 space-y-6 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[var(--text-secondary)] text-xs font-semibold mb-3">
                <span>Ready to Join Watchroom</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                {roomName}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {mediaMode === 'screen' ? 'Screen Share Mode' : 'Local Video Sync Mode'} / {isHost ? 'Host Session' : 'Participant'}
              </p>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                Your Display Name
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                maxLength={32}
                className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleJoinClick(false)}
                disabled={!userName.trim()}
                className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black dark:text-black font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Join Now</span>
                <ArrowRight size={16} />
              </button>

              {mediaMode === 'screen' && isHost && (
                <button
                  type="button"
                  onClick={() => handleJoinClick(true)}
                  disabled={!userName.trim()}
                  className="w-full py-3.5 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-secondary)] font-bold text-xs rounded-xl border border-black/[0.06] dark:border-white/[0.08] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ScreenCastIcon size={16} />
                  <span>Present Screen on Entry</span>
                </button>
              )}
            </div>

            {/* Copy Room Link */}
            <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                <span>Max 4 Participants</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition cursor-pointer font-medium"
              >
                {copiedLink ? <CheckCircle2 size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Meeting Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full mx-auto py-3 text-center text-xs text-[var(--text-tertiary)] font-medium">
        <span>Protected with Appwrite Document-Level Security / Zero Video Cloud Storage</span>
      </footer>
    </div>
  );
};
