import React, { useState, useEffect, useRef } from 'react';
import { SynLogo, LiquidMicIcon, LiquidMicOffIcon, ScreenCastIcon } from './icons/SynIcons';
import { LiquidGlassCard } from './LiquidGlassCard';
import { Video, VideoOff, Copy, CheckCircle2, ArrowRight, Sparkles, Users } from 'lucide-react';

interface GreenRoomProps {
  roomName: string;
  roomId: string;
  initialUserName: string;
  mediaMode: 'screen' | 'local_file';
  isHost: boolean;
  onJoin: (userName: string, micEnabled: boolean, videoEnabled: boolean, presentImmediately: boolean) => void;
  onCancel: () => void;
}

/**
 * Google Meet-inspired Pre-Meeting Green Room.
 * Allows participants to verify camera, audio, display name, and devices before entering.
 */
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

  // Initialize camera & microphone preview
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

        // Set up audio visualizer
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
          // Ignore audio meter initialization issues
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

  // Toggle mic track enabled
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
    // Stop local preview tracks so RoomView can capture freshly
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
    }
    onJoin(userName.trim() || 'Guest', isMicOn, isVideoOn, present);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 font-sans select-none z-20">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-3 px-6 rounded-full bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-2xl shrink-0">
        <div className="flex items-center gap-3">
          <SynLogo size={32} className="shrink-0" />
          <div className="flex flex-col">
            <span className="text-white font-black text-base tracking-tight leading-none">SynCine</span>
            <span className="text-[11px] text-slate-400 font-medium">Pre-Meeting Device Check</span>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
        >
          Cancel
        </button>
      </header>

      {/* Center Stage Container */}
      <main className="w-full max-w-5xl mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Device Preview Window */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <LiquidGlassCard variant="surface" className="w-full aspect-video rounded-3xl relative overflow-hidden bg-black flex items-center justify-center shadow-2xl">
            {isVideoOn && previewStream?.getVideoTracks().length ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black text-slate-400 p-6">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-900/50 to-pink-900/40 border border-white/15 flex items-center justify-center text-indigo-300 font-black text-3xl mb-3 shadow-xl">
                  {userName.charAt(0).toUpperCase() || 'C'}
                </div>
                <span className="text-xs font-medium text-slate-400">Camera is off</span>
              </div>
            )}

            {/* Bottom In-Tile Device Controls */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                {/* Microphone Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-3 rounded-2xl transition cursor-pointer ${
                    isMicOn
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                      : 'bg-rose-600/80 hover:bg-rose-600 text-white'
                  }`}
                  title={isMicOn ? 'Turn mic off' : 'Turn mic on'}
                >
                  {isMicOn ? <LiquidMicIcon size={18} /> : <LiquidMicOffIcon size={18} />}
                </button>

                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-3 rounded-2xl transition cursor-pointer ${
                    isVideoOn
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                      : 'bg-rose-600/80 hover:bg-rose-600 text-white'
                  }`}
                  title={isVideoOn ? 'Turn camera off' : 'Turn camera on'}
                >
                  {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
              </div>

              {/* Live Audio Level Indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/10">
                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-75 rounded-full"
                    style={{ width: `${isMicOn ? audioLevel : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {isMicOn ? (audioLevel > 10 ? 'Audio OK' : 'Mic Active') : 'Muted'}
                </span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Right: Meeting Details & Join Action Card */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <LiquidGlassCard variant="surface" className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
                <Sparkles size={13} className="text-pink-400" />
                <span>Ready to Join Watchroom</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {roomName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mediaMode === 'screen' ? 'Screen Share Mode' : 'Local Video Sync Mode'} &middot; {isHost ? 'Host Session' : 'Participant'}
              </p>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                Your Display Name
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                maxLength={32}
                className="w-full bg-black/50 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleJoinClick(false)}
                disabled={!userName.trim()}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Join Now</span>
                <ArrowRight size={16} />
              </button>

              {mediaMode === 'screen' && isHost && (
                <button
                  type="button"
                  onClick={() => handleJoinClick(true)}
                  disabled={!userName.trim()}
                  className="w-full py-3.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-bold text-xs rounded-2xl border border-white/10 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ScreenCastIcon size={16} />
                  <span>Present Screen on Entry</span>
                </button>
              )}
            </div>

            {/* Copy Room Link */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-indigo-400" />
                <span>Max 4 Participants</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-slate-300 hover:text-white transition cursor-pointer font-medium"
              >
                {copiedLink ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Meeting Link'}</span>
              </button>
            </div>
          </LiquidGlassCard>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-3 text-center text-xs text-slate-500 font-medium">
        <span>Protected with Appwrite Document-Level Security &middot; Zero Video Cloud Storage</span>
      </footer>
    </div>
  );
};
