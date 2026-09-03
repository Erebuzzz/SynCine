import React, { useState, useEffect, useRef } from 'react';
import { SynLogo, LiquidMicIcon, LiquidMicOffIcon, ScreenCastIcon } from './icons/SynIcons';
import { Video, VideoOff, Copy, CheckCircle2, ArrowRight, Users, X } from 'lucide-react';
import {
  formatRoomCode,
  databases,
  realtime,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  RoomDocument
} from '../lib/appwrite';

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
  const [liveOccupancy, setLiveOccupancy] = useState<number | null>(null);
  const [isMirrored] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syncine-camera-mirrored') === 'true';
    }
    return false;
  });

  // Query live room occupancy and subscribe to realtime participant count
  useEffect(() => {
    let isMounted = true;

    databases.getDocument<RoomDocument>(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, roomId)
      .then((doc) => {
        if (isMounted && typeof doc.participantCount === 'number') {
          setLiveOccupancy(doc.participantCount);
        }
      })
      .catch(() => {});

    const unsubscribe = realtime.subscribe(
      `databases.${APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.ROOMS}.documents.${roomId}`,
      (event: any) => {
        if (isMounted && event?.payload?.participantCount !== undefined) {
          setLiveOccupancy(event.payload.participantCount);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [roomId]);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioMeterBarRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize camera and microphone preview with resilient fallback
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    async function setupPreview() {
      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: 'user'
          }
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
          console.warn('Initial getUserMedia constraints failed, trying basic audio/video:', initialErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: true
            });
          } catch (vidErr) {
            console.warn('Audio+Video failed, falling back to audio only:', vidErr);
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
              });
            } catch (audErr) {
              console.warn('Microphone also failed, trying video only:', audErr);
              stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true
              });
            }
          }
        }

        if (isCancelled || !stream) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        const hasVideo = stream.getVideoTracks().length > 0;
        const hasAudio = stream.getAudioTracks().length > 0;

        setPreviewStream(stream);
        setIsVideoOn(hasVideo);
        setIsMicOn(hasAudio);

        // Setup audio analysis for the level indicator
        if (hasAudio) {
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateAudioMeter = () => {
              if (!analyserRef.current || !audioMeterBarRef.current) {
                if (audioMeterBarRef.current) audioMeterBarRef.current.style.width = '0%';
              } else {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const level = Math.min(100, Math.round((avg / 128) * 100));
                audioMeterBarRef.current.style.width = `${level}%`;
              }
              animFrameRef.current = requestAnimationFrame(updateAudioMeter);
            };
            updateAudioMeter();
          } catch {
          }
        }
      } catch (err) {
        console.warn('Media preview setup error:', err);
        setIsVideoOn(false);
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
  }, []);

  // Ensure video element receives pure video-only stream with guaranteed DOM muting
  useEffect(() => {
    const video = videoPreviewRef.current;
    if (!video) return;

    let videoTrack: MediaStreamTrack | null = null;
    let attemptPlay: (() => void) | null = null;

    if (isVideoOn && previewStream && previewStream.getVideoTracks().length > 0) {
      videoTrack = previewStream.getVideoTracks()[0];
      video.defaultMuted = true;
      video.muted = true;

      // Crucial: video-only stream prevents Chromium Autoplay Policy from blocking playback
      const videoOnlyStream = new MediaStream([videoTrack]);
      video.srcObject = videoOnlyStream;

      attemptPlay = () => {
        video.play().catch((err) => {
          console.warn('Preview video play attempt postponed:', err);
        });
      };

      video.onloadedmetadata = attemptPlay;
      attemptPlay();

      videoTrack.addEventListener('unmute', attemptPlay);
    } else {
      video.srcObject = null;
    }

    return () => {
      if (video) {
        video.onloadedmetadata = null;
      }
      if (videoTrack && attemptPlay) {
        videoTrack.removeEventListener('unmute', attemptPlay);
      }
    };
  }, [previewStream, isVideoOn]);

  const handleToggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (previewStream) {
      previewStream.getAudioTracks().forEach((t) => {
        t.enabled = nextState;
      });
    }
    if (!nextState && audioMeterBarRef.current) {
      audioMeterBarRef.current.style.width = '0%';
    }
  };

  const handleToggleVideo = async () => {
    const nextState = !isVideoOn;
    setIsVideoOn(nextState);

    if (!nextState) {
      if (previewStream) {
        previewStream.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
    } else {
      if (previewStream) {
        const liveVideoTrack = previewStream.getVideoTracks().find((t) => t.readyState === 'live');
        if (liveVideoTrack) {
          liveVideoTrack.enabled = true;
          setPreviewStream(new MediaStream(previewStream.getTracks()));
        } else {
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            });
            const newTrack = newStream.getVideoTracks()[0];
            if (newTrack) {
              previewStream.getVideoTracks().forEach((t) => previewStream.removeTrack(t));
              previewStream.addTrack(newTrack);
              setPreviewStream(new MediaStream(previewStream.getTracks()));
            }
          } catch (err) {
            console.warn('Unable to enable camera:', err);
            setIsVideoOn(false);
          }
        }
      }
    }
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/${formatRoomCode(roomId)}`;
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
    <div className="relative min-h-screen w-full flex flex-col justify-between select-none z-20">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between py-4 px-6 sm:px-12 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <SynLogo size={30} className="shrink-0" />
          <span className="text-[var(--text-primary)] font-semibold text-lg tracking-tight leading-none">SynCine</span>
        </div>

        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
        >
          <X size={15} />
          <span>Leave</span>
        </button>
      </header>

      {/* Center Device Staging Stage */}
      <main className="w-full max-w-5xl mx-auto my-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center animate-enter-smooth">
        {/* Left: Clean Camera Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full aspect-video rounded-2xl sm:rounded-3xl relative overflow-hidden bg-black flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1] shadow-2xl">
            {isVideoOn && previewStream?.getVideoTracks().length ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[var(--text-secondary)] p-6">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/60 font-semibold text-2xl mb-3">
                  {userName ? userName.charAt(0).toUpperCase() : 'G'}
                </div>
                <span className="text-xs text-white/50">Camera Off</span>
              </div>
            )}

            {/* Bottom In-Tile Controls */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMic}
                  className={`p-2.5 rounded-xl transition cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center ${
                    isMicOn
                      ? 'bg-white/10 text-white border border-white/15 hover:bg-white/20'
                      : 'bg-[var(--destructive)]/20 text-[var(--destructive)] border border-[var(--destructive)]/30'
                  }`}
                  title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
                  aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isMicOn ? <LiquidMicIcon size={16} /> : <LiquidMicOffIcon size={16} />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleVideo}
                  className={`p-2.5 rounded-xl transition cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center ${
                    isVideoOn
                      ? 'bg-white/10 text-white border border-white/15 hover:bg-white/20'
                      : 'bg-[var(--destructive)]/20 text-[var(--destructive)] border border-[var(--destructive)]/30'
                  }`}
                  title={isVideoOn ? 'Turn camera off' : 'Turn camera on'}
                  aria-label={isVideoOn ? 'Turn camera off' : 'Turn camera on'}
                >
                  {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
              </div>

              {/* Audio Activity Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-white/70">
                <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    ref={audioMeterBarRef}
                    className="h-full bg-[var(--accent)] transition-all duration-75 rounded-full"
                    style={{ width: '0%' }}
                  />
                </div>
                <span className="text-[11px]">{isMicOn ? 'Mic Ready' : 'Muted'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Joining Panel */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 realistic-glass rounded-2xl sm:rounded-3xl">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-semibold text-[var(--accent)]">
                  {isHost ? 'Host Session' : 'Guest Session'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border border-black/[0.06] dark:border-white/[0.08]">
                  {formatRoomCode(roomId)}
                </span>
                {liveOccupancy !== null && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      liveOccupancy > 0
                        ? 'bg-[#30D158]/10 text-[#30D158] border-[#30D158]/20'
                        : 'bg-black/[0.03] dark:bg-white/[0.05] text-[var(--text-tertiary)] border-black/[0.06] dark:border-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        liveOccupancy > 0 ? 'bg-[#30D158] animate-pulse' : 'bg-gray-400'
                      }`}
                    />
                    <span>
                      {liveOccupancy > 0
                        ? liveOccupancy === 1
                          ? '1 person waiting in room'
                          : `${liveOccupancy} people in room`
                        : 'No one is in the room yet'}
                    </span>
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                {roomName}
              </h2>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Your Display Name
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                maxLength={32}
                className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition"
              />
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => handleJoinClick(false)}
                disabled={!userName.trim()}
                className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black font-semibold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm group hover:scale-[1.01]"
              >
                <span>Enter Watchroom</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>

              {mediaMode === 'screen' && isHost && (
                <button
                  type="button"
                  onClick={() => handleJoinClick(true)}
                  disabled={!userName.trim()}
                  className="w-full py-3 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium rounded-xl border border-black/[0.06] dark:border-white/[0.08] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ScreenCastIcon size={15} />
                  <span>Present Screen Immediately</span>
                </button>
              )}
            </div>

            {/* Invite Link */}
            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                <span>Up to 4 participants</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-[var(--text-primary)] hover:underline transition cursor-pointer font-medium"
              >
                {copiedLink ? <CheckCircle2 size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full mx-auto py-4 text-center text-xs text-[var(--text-tertiary)]">
        <span>Direct encrypted peer-to-peer media stream</span>
      </footer>
    </div>
  );
};
