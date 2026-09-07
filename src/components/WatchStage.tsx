import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DraggableTile } from './DraggableTile';
import { formatRoomCode, extractYouTubeId } from '../lib/appwrite';
import {
  SynLogo,
  TheaterLayoutIcon,
  GridLayoutIcon,
  FloatingLayoutIcon,
  ScreenCastIcon,
  CinemaReelIcon,
  LiquidMicIcon,
  LiquidMicOffIcon,
  MeshNetworkIcon
} from './icons/SynIcons';
import {
  Share2,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  MessageSquare,
  LogOut,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sliders,
  Video,
  VideoOff,
  Settings,
  ShieldAlert,
  Smile,
  Pin,
  PinOff,
  Command,
  HelpCircle,
  FlipHorizontal,
  Aperture,
  SunMedium,
  Clock,
  ChevronUp,
  Check,
  Youtube,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { MediaDeviceInfoItem } from '../lib/media-capture';
import { format12HourTime } from '../lib/time-cycle';
import { EmojiReactions, type FloatingReaction } from './EmojiReactions';
import { SynEmojiId } from './icons/SynEmojiIcons';
import { HostControlsModal } from './HostControlsModal';
import { ShortcutsModal } from './ShortcutsModal';
import { DrmGuideModal } from './DrmGuideModal';
import { YouTubeSyncPlayer } from './YouTubeSyncPlayer';
import { AmbilightGlow } from './AmbilightGlow';
import { CinemaAudioProcessor, DialogueBoostLevel } from '../lib/audio-processing';
import { BLUR_PRESETS, MAX_BLUR_RADIUS } from '../lib/background-blur';
import { useAnchoredPopup } from '../hooks/useAnchoredPopup';
import PopupPortal from './PopupPortal';

export type DisplayLayout = 'theater' | 'grid' | 'floating';

export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isSelf?: boolean;
  isMicActive?: boolean;
  isCameraActive?: boolean;
  isMirrored?: boolean;
}

interface WatchStageProps {
  roomName: string;
  roomId: string;
  mediaMode: 'screen' | 'local_file' | 'youtube';
  youtubeVideoId?: string;
  youtubeSyncState?: { currentTime: number; isPlaying: boolean; timestamp: number } | null;
  onYouTubeSyncAction?: (state: { currentTime: number; isPlaying: boolean }) => void;
  isHost: boolean;
  currentUserId: string;
  currentUserName: string;
  mediaStream?: MediaStream;
  localFileUrl?: string;
  participants: Participant[];
  isMicActive: boolean;
  isCameraActive?: boolean;
  isCameraMirrored?: boolean;
  onToggleCameraMirror?: (mirrored: boolean) => void;
  bgBlurRadius?: number;
  onSetBlurRadius?: (radius: number) => void;
  isSharingScreen: boolean;
  onToggleMic: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare: () => void;
  onSelectLocalFile: (file: File) => void;
  onStartYouTubeBroadcast?: (videoId: string, url: string) => void;
  onStopYouTubeBroadcast?: () => void;
  onLeaveRoom: () => void;
  videoRefCallback?: (el: HTMLVideoElement | null) => void;
  childrenChat?: React.ReactNode;
  childrenSettings?: React.ReactNode;
  unreadChatCount?: number;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
  onCloseChat?: () => void;
  onOpenSettings?: () => void;

  // Host Controls
  isRoomLocked?: boolean;
  onToggleRoomLock?: () => void;
  onMuteAllViewers?: () => void;
  onMuteParticipant?: (peerId: string) => void;
  onKickParticipant?: (peerId: string) => void;
  onEndSessionForAll?: () => void;

  // Emoji Reactions
  activeReactions?: FloatingReaction[];
  onSendEmojiReaction?: (emojiId: SynEmojiId) => void;

  // Direct Audio & Video Input Device Switchers
  audioInputDevices?: MediaDeviceInfoItem[];
  selectedAudioDeviceId?: string;
  onSelectAudioInputDevice?: (deviceId: string) => void;
  videoInputDevices?: MediaDeviceInfoItem[];
  selectedVideoDeviceId?: string;
  onSelectVideoInputDevice?: (deviceId: string) => void;
}

interface StreamVideoPlayerProps {
  stream?: MediaStream;
  src?: string;
  isMuted?: boolean;
  isCamera?: boolean;
  volume?: number;
  isMirrored?: boolean;
  className?: string;
  controls?: boolean;
  onMount?: (el: HTMLVideoElement) => void;
}

/**
 * High-performance, memoized video player for WebRTC and media streams.
 * Eliminates frame flickering by isolating stream attachment and volume adjustments
 * from React component re-render cycles.
 * For camera video feeds (isCamera=true), the video element is permanently muted so
 * autoplay is guaranteed without user gesture blocking.
 */
const StreamVideoPlayer: React.FC<StreamVideoPlayerProps> = React.memo(({
  stream,
  src,
  isMuted = false,
  isCamera = false,
  volume = 1,
  isMirrored = false,
  className = '',
  controls = false,
  onMount
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackMutedRef = useRef<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      const newVideoTracks = stream.getVideoTracks();
      const newAudioTracks = stream.getAudioTracks();
      if (isCamera && newVideoTracks.length === 0) {
        video.srcObject = null;
        return;
      }

      // Check whether srcObject actually needs re-assignment to avoid resetting decoder buffers
      const currentSrcObject = video.srcObject as MediaStream | null;
      const currentVideoTracks = currentSrcObject?.getVideoTracks() || [];
      const currentAudioTracks = currentSrcObject?.getAudioTracks() || [];
      const needsNewStream =
        !currentSrcObject ||
        currentVideoTracks.length !== newVideoTracks.length ||
        currentVideoTracks[0]?.id !== newVideoTracks[0]?.id ||
        currentAudioTracks.length !== newAudioTracks.length ||
        currentAudioTracks[0]?.id !== newAudioTracks[0]?.id;

      if (needsNewStream) {
        const targetStream = isCamera ? new MediaStream(newVideoTracks) : new MediaStream(stream.getTracks());
        video.srcObject = targetStream;
      }

      // Camera feeds must always be muted for instant zero-gesture autoplay
      video.muted = isCamera ? true : (fallbackMutedRef.current || isMuted);
      video.volume = (isCamera || isMuted) ? 0 : Math.max(0, Math.min(1, volume));

      const attemptPlay = () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name === 'NotAllowedError' && !video.muted) {
              console.warn('Autoplay blocked with sound. Falling back to muted playback:', err);
              fallbackMutedRef.current = true;
              video.muted = true;
              video.play().catch(() => {});
            } else if (err.name !== 'AbortError') {
              console.warn('Playback error encountered:', err);
            }
          });
        }
      };

      attemptPlay();

      // Listen for unmute event on video track (fires when first RTP packet arrives)
      const primaryVideoTrack = newVideoTracks[0];
      if (primaryVideoTrack) {
        primaryVideoTrack.addEventListener('unmute', attemptPlay);
      }

      const primaryAudioTrack = newAudioTracks[0];
      if (primaryAudioTrack) {
        primaryAudioTrack.addEventListener('unmute', attemptPlay);
      }

      const handleTrackChange = () => {
        const freshVideoTracks = stream.getVideoTracks();
        if (isCamera) {
          if (freshVideoTracks.length > 0) {
            video.srcObject = new MediaStream(freshVideoTracks);
            attemptPlay();
          } else {
            video.srcObject = null;
          }
        } else {
          video.srcObject = new MediaStream(stream.getTracks());
          attemptPlay();
        }
      };

      stream.addEventListener('addtrack', handleTrackChange);
      stream.addEventListener('removetrack', handleTrackChange);

      const handleUserGestureUnmute = () => {
        if (fallbackMutedRef.current && !isCamera && !isMuted) {
          fallbackMutedRef.current = false;
          video.muted = false;
          video.volume = Math.max(0, Math.min(1, volume));
          video.play().catch(() => {});
        }
      };

      window.addEventListener('click', handleUserGestureUnmute);
      window.addEventListener('keydown', handleUserGestureUnmute);

      return () => {
        if (primaryVideoTrack) {
          primaryVideoTrack.removeEventListener('unmute', attemptPlay);
        }
        if (primaryAudioTrack) {
          primaryAudioTrack.removeEventListener('unmute', attemptPlay);
        }
        stream.removeEventListener('addtrack', handleTrackChange);
        stream.removeEventListener('removetrack', handleTrackChange);
        window.removeEventListener('click', handleUserGestureUnmute);
        window.removeEventListener('keydown', handleUserGestureUnmute);
      };
    } else if (src) {
      if (video.src !== src) {
        video.src = src;
      }
    } else {
      video.srcObject = null;
    }
  }, [stream, src, isMuted, isCamera, volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!fallbackMutedRef.current) {
      video.muted = isCamera ? true : isMuted;
    }
    video.volume = (isCamera || isMuted) ? 0 : Math.max(0, Math.min(1, volume));
  }, [isMuted, isCamera, volume]);

  useEffect(() => {
    if (videoRef.current && onMount) {
      onMount(videoRef.current);
    }
  }, [onMount]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      controls={controls}
      muted={isCamera ? true : (fallbackMutedRef.current || isMuted)}
      className={`w-full h-full ${isMirrored ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
});

interface RemoteAudioPlayerProps {
  peerId: string;
  stream?: MediaStream;
  isMuted?: boolean;
  volume?: number;
}

/**
 * Dedicated, invisible audio player for remote participant WebRTC audio feeds.
 * Decoupled from video rendering to ensure remote audio plays continuously
 * whether the participant has their camera enabled or disabled.
 */
const RemoteAudioPlayer: React.FC<RemoteAudioPlayerProps> = React.memo(({
  peerId,
  stream,
  isMuted = false,
  volume = 0.8
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (stream && stream.getAudioTracks().length > 0) {
      const audioStream = new MediaStream(stream.getAudioTracks());
      audio.srcObject = audioStream;
      audio.muted = isMuted;
      audio.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));

      const playAudio = () => {
        audio.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn(`Remote audio playback issue for peer ${peerId}:`, err);
          }
        });
      };

      playAudio();

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.addEventListener('unmute', playAudio);
        return () => {
          audioTrack.removeEventListener('unmute', playAudio);
        };
      }
    } else {
      audio.srcObject = null;
    }
  }, [stream, isMuted, volume, peerId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
    audio.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));
  }, [isMuted, volume]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
});

interface TileActionControlsProps {
  participant: Participant;
  isPinned: boolean;
  onTogglePin: () => void;
  bgBlurRadius?: number;
  onSetBlurRadius?: (radius: number) => void;
  size?: 'sm' | 'md';
}

const TileActionControls: React.FC<TileActionControlsProps> = ({
  participant,
  isPinned,
  onTogglePin,
  bgBlurRadius,
  onSetBlurRadius,
  size = 'sm'
}) => {
  const [isBlurMenuOpen, setIsBlurMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isBlurMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsBlurMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleClickOutside);
    return () => window.removeEventListener('pointerdown', handleClickOutside);
  }, [isBlurMenuOpen]);

  const paddingClass = size === 'md' ? 'p-2 rounded-xl' : 'p-1.5 rounded-lg';
  const iconSize = size === 'md' ? 15 : 13;
  const isBlurActive = typeof bgBlurRadius === 'number' && bgBlurRadius > 0;

  return (
    <div className={`absolute ${size === 'md' ? 'top-3 right-3' : 'top-2 right-2'} z-20 flex items-center gap-1.5`}>
      {participant.isSelf && onSetBlurRadius && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsBlurMenuOpen((prev) => !prev);
            }}
            className={`${paddingClass} backdrop-blur-md border transition cursor-pointer ${
              isBlurMenuOpen || isBlurActive
                ? 'bg-[var(--accent)] text-black border-[var(--accent)] opacity-100 shadow-md'
                : 'bg-black/60 text-white/80 border-white/15 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white hover:bg-black/80'
            }`}
            title="Background Blur & Portrait Bokeh"
          >
            <Aperture size={iconSize} />
          </button>

          {isBlurMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full mt-1.5 right-0 w-56 sm:w-60 p-3 rounded-2xl bg-black/95 dark:bg-[#121215]/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-50 animate-enter-smooth text-xs select-none text-white cursor-default"
            >
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10 font-bold">
                <span className="flex items-center gap-1.5">
                  <Aperture size={13} className="text-[var(--accent)]" />
                  <span>Portrait Blur</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[var(--accent)]">
                  {isBlurActive ? `${bgBlurRadius}px` : 'Off'}
                </span>
              </div>

              {/* Preset chips */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  { label: 'Off', val: BLUR_PRESETS.OFF },
                  { label: 'Subtle', val: BLUR_PRESETS.SUBTLE },
                  { label: 'Portrait', val: BLUR_PRESETS.PORTRAIT },
                  { label: 'Deep', val: BLUR_PRESETS.DEEP }
                ].map((preset) => {
                  const isSelected = (bgBlurRadius ?? 0) === preset.val;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => onSetBlurRadius(preset.val)}
                      className={`py-1.5 px-1 rounded-xl text-center text-[10px] font-semibold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[var(--accent)] text-black border-transparent shadow-xs'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Range slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-white/60">
                  <span>Fine-tune Radius</span>
                  <span className="font-mono">{bgBlurRadius ?? 0}px / {MAX_BLUR_RADIUS}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={MAX_BLUR_RADIUS}
                  value={bgBlurRadius ?? 0}
                  onChange={(e) => onSetBlurRadius(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pin Feed Button on Hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        className={`${paddingClass} backdrop-blur-md border transition cursor-pointer ${
          isPinned
            ? 'bg-[var(--accent)] text-black border-[var(--accent)] opacity-100 shadow-md'
            : 'bg-black/60 text-white/80 border-white/15 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white hover:bg-black/80'
        }`}
        title={isPinned ? 'Unpin Feed (P)' : 'Pin Feed to Stage (P)'}
      >
        {isPinned ? <PinOff size={iconSize} /> : <Pin size={iconSize} />}
      </button>
    </div>
  );
};

export const WatchStage: React.FC<WatchStageProps> = ({
  roomName,
  roomId,
  mediaMode,
  youtubeVideoId,
  youtubeSyncState,
  onYouTubeSyncAction,
  isHost,
  participants,
  mediaStream,
  localFileUrl,
  isMicActive,
  isCameraActive = false,
  isCameraMirrored = false,
  onToggleCameraMirror,
  bgBlurRadius = 0,
  onSetBlurRadius,
  isSharingScreen,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onSelectLocalFile,
  onStartYouTubeBroadcast,
  onStopYouTubeBroadcast,
  onLeaveRoom,
  videoRefCallback,
  childrenChat,
  childrenSettings,
  unreadChatCount = 0,
  isChatOpen: controlledChatOpen,
  onToggleChat,
  onCloseChat,
  onOpenSettings,
  isRoomLocked,
  onToggleRoomLock,
  onMuteAllViewers,
  onMuteParticipant,
  onKickParticipant,
  onEndSessionForAll,
  activeReactions,
  onSendEmojiReaction,
  audioInputDevices = [],
  selectedAudioDeviceId,
  onSelectAudioInputDevice,
  videoInputDevices = [],
  selectedVideoDeviceId,
  onSelectVideoInputDevice
}) => {
  const [layout, setLayout] = useState<DisplayLayout>('theater');
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [mutedPeers, setMutedPeers] = useState<Record<string, boolean>>({});
  const [mainVideoMuted, setMainVideoMuted] = useState(false);
  const [mainVideoVolume, setMainVideoVolume] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [internalChatOpen, setInternalChatOpen] = useState(false);
  const isChatOpen = controlledChatOpen !== undefined ? controlledChatOpen : internalChatOpen;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEmojiTrayOpen, setIsEmojiTrayOpen] = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isDrmGuideOpen, setIsDrmGuideOpen] = useState(false);
  const [isBlurMenuOpen, setIsBlurMenuOpen] = useState(false);
  const [isMicMenuOpen, setIsMicMenuOpen] = useState(false);
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);
  const [isBroadcastMenuOpen, setIsBroadcastMenuOpen] = useState(false);
  const [broadcastView, setBroadcastView] = useState<'sources' | 'youtube_input' | 'active_manage'>('sources');
  const [youtubeInputUrl, setYoutubeInputUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  // Portal-based popup positioning hooks
  const micPopup = useAnchoredPopup(isMicMenuOpen);
  const cameraPopup = useAnchoredPopup(isCameraMenuOpen);
  const blurPopup = useAnchoredPopup(isBlurMenuOpen);
  const broadcastPopup = useAnchoredPopup(isBroadcastMenuOpen);
  const reactionsPopup = useAnchoredPopup(isEmojiTrayOpen);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // For each menu, check both the trigger element and the portal popup
      if (isMicMenuOpen) {
        const inTrigger = micPopup.triggerRef.current?.contains(target);
        const inPopup = micPopup.popupRef.current?.contains(target);
        if (!inTrigger && !inPopup) setIsMicMenuOpen(false);
      }
      if (isCameraMenuOpen) {
        const inTrigger = cameraPopup.triggerRef.current?.contains(target);
        const inPopup = cameraPopup.popupRef.current?.contains(target);
        if (!inTrigger && !inPopup) setIsCameraMenuOpen(false);
      }
      if (isBlurMenuOpen) {
        const inTrigger = blurPopup.triggerRef.current?.contains(target);
        const inPopup = blurPopup.popupRef.current?.contains(target);
        if (!inTrigger && !inPopup) setIsBlurMenuOpen(false);
      }
      if (isBroadcastMenuOpen) {
        const inTrigger = broadcastPopup.triggerRef.current?.contains(target);
        const inPopup = broadcastPopup.popupRef.current?.contains(target);
        if (!inTrigger && !inPopup) setIsBroadcastMenuOpen(false);
      }
      if (isEmojiTrayOpen) {
        const inTrigger = reactionsPopup.triggerRef.current?.contains(target);
        const inPopup = reactionsPopup.popupRef.current?.contains(target);
        if (!inTrigger && !inPopup) setIsEmojiTrayOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMicMenuOpen, isCameraMenuOpen, isBlurMenuOpen, isBroadcastMenuOpen, isEmojiTrayOpen]);

  // Picture-in-Picture State
  const [isPiPActive, setIsPiPActive] = useState(false);

  // Ambilight State (defaults to true)
  const [isAmbilightEnabled, setIsAmbilightEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syncine-ambilight') !== 'false';
    }
    return true;
  });

  // Audio Processing State (Dialogue Boost & Night Mode)
  const [dialogueBoost, setDialogueBoost] = useState<DialogueBoostLevel>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('syncine-dialogue-boost') as DialogueBoostLevel) || 'off';
    }
    return 'off';
  });
  const [nightMode, setNightMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syncine-night-mode') === 'true';
    }
    return false;
  });
  const audioProcessorRef = useRef<CinemaAudioProcessor | null>(null);

  // Live Meeting Current Time (12-Hour Format)
  const [currentTime, setCurrentTime] = useState<string>(() => format12HourTime());
  useEffect(() => {
    const updateTime = () => setCurrentTime(format12HourTime());
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Feed Pinning State
  const [pinnedFeedId, setPinnedFeedId] = useState<string | null>(null);

  // Full Screen Auto-hiding Controls on Mouse Inactivity
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const spaceTalkActiveRef = useRef(false);

  const resetControlsTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  }, [isFullscreen]);

  const toggleChat = () => {
    if (onToggleChat) {
      onToggleChat();
    } else {
      setInternalChatOpen(!internalChatOpen);
    }
  };

  const closeChat = () => {
    if (onCloseChat) {
      onCloseChat();
    }
    setInternalChatOpen(false);
  };

  const mainStageContainerRef = useRef<HTMLDivElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mainVideoRef.current && videoRefCallback) {
      videoRefCallback(mainVideoRef.current);
    }
  }, [videoRefCallback, localFileUrl, mediaStream]);

  const toggleMutePeer = (peerId: string) => {
    setMutedPeers((prev) => ({ ...prev, [peerId]: !prev[peerId] }));
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/${formatRoomCode(roomId)}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const isBroadcastingActive = isSharingScreen || Boolean(localFileUrl) || (mediaMode === 'youtube' && Boolean(youtubeVideoId));
  const activeBroadcastLabel = isSharingScreen
    ? 'Screen Share'
    : (localFileUrl ? 'Local Media' : (mediaMode === 'youtube' && youtubeVideoId ? 'YouTube CDN' : ''));

  const handleStopBroadcast = () => {
    if (isSharingScreen) {
      onToggleScreenShare();
    }
    if (localFileUrl) {
      onToggleScreenShare();
    }
    if (mediaMode === 'youtube' && onStopYouTubeBroadcast) {
      onStopYouTubeBroadcast();
    }
    setIsBroadcastMenuOpen(false);
  };

  const handleStartYouTubeSubmit = () => {
    const trimmed = youtubeInputUrl.trim();
    if (!trimmed) {
      setYoutubeError('Please enter a YouTube video URL or ID.');
      return;
    }
    const extractedId = extractYouTubeId(trimmed);
    if (!extractedId) {
      setYoutubeError('Invalid YouTube video link or ID.');
      return;
    }
    if (isSharingScreen || localFileUrl) {
      onToggleScreenShare();
    }
    if (onStartYouTubeBroadcast) {
      onStartYouTubeBroadcast(extractedId, trimmed);
    }
    setIsBroadcastMenuOpen(false);
    setYoutubeInputUrl('');
    setYoutubeError(null);
  };

  // Picture-in-Picture Toggle
  const togglePictureInPicture = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (mainVideoRef.current && document.pictureInPictureEnabled) {
        await mainVideoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.warn('Picture-in-picture error:', err);
    }
  };

  // Video tracking for PiP events and Cinema Web Audio
  useEffect(() => {
    const video = mainVideoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    // Attach audio processing for speech clarity & night compression
    if (!audioProcessorRef.current) {
      audioProcessorRef.current = new CinemaAudioProcessor();
    }
    audioProcessorRef.current.attachMediaElement(video, { dialogueBoost, nightMode });

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [localFileUrl, mediaStream]);

  // Apply audio boost and night mode settings updates dynamically
  useEffect(() => {
    audioProcessorRef.current?.applyConfig({ dialogueBoost, nightMode });
    if (typeof window !== 'undefined') {
      localStorage.setItem('syncine-dialogue-boost', dialogueBoost);
      localStorage.setItem('syncine-night-mode', nightMode.toString());
    }
  }, [dialogueBoost, nightMode]);

  // Persist ambilight state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('syncine-ambilight', isAmbilightEnabled ? 'true' : 'false');
    }
  }, [isAmbilightEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mainStageContainerRef.current
        ?.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          resetControlsTimer();
        })
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
          setIsControlsVisible(true);
        })
        .catch(() => {});
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        setIsControlsVisible(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      } else {
        resetControlsTimer();
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [resetControlsTimer]);

  // Mouse move listener to show controls in fullscreen
  useEffect(() => {
    const handleMouseMove = () => {
      if (isFullscreen) {
        resetControlsTimer();
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isFullscreen, resetControlsTimer]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el.isContentEditable ||
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      // Never intercept browser or system key combinations (e.g. Ctrl+Shift+I for DevTools, Ctrl+S, Ctrl+C, Cmd+R)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Space: Push-to-Talk (Hold space to speak)
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat && !isMicActive && !spaceTalkActiveRef.current) {
          spaceTalkActiveRef.current = true;
          onToggleMic();
        }
        return;
      }

      const key = e.key.toLowerCase();

      // M: Toggle Mic
      if (key === 'm') {
        e.preventDefault();
        onToggleMic();
      }
      // O: Toggle Camera
      else if (key === 'o' && onToggleCamera) {
        e.preventDefault();
        onToggleCamera();
      }
      // R: Reactions
      else if (key === 'r') {
        e.preventDefault();
        setIsEmojiTrayOpen((prev) => !prev);
      }
      // S: Settings
      else if (key === 's' && onOpenSettings) {
        e.preventDefault();
        onOpenSettings();
      }
      // F: Fullscreen
      else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Esc: Exit Fullscreen / Close Modals
      else if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
        } else if (isDrmGuideOpen) {
          setIsDrmGuideOpen(false);
        } else if (isEmojiTrayOpen) {
          setIsEmojiTrayOpen(false);
        } else if (isHostControlsOpen) {
          setIsHostControlsOpen(false);
        } else if (isChatOpen) {
          closeChat();
        } else if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      // \: Camera Mirror Mode
      else if (e.key === '\\' && onToggleCameraMirror) {
        e.preventDefault();
        onToggleCameraMirror(!isCameraMirrored);
      }
      // C: Chat
      else if (key === 'c') {
        e.preventDefault();
        toggleChat();
      }
      // Shift+P: Picture-in-Picture
      if (e.shiftKey && (key === 'p')) {
        e.preventDefault();
        togglePictureInPicture();
      }
      // P: Pin / Unpin Feed
      else if (key === 'p') {
        e.preventDefault();
        setPinnedFeedId((prev) => (prev ? null : 'screen'));
      }
      // A: Toggle Dynamic Ambilight
      else if (key === 'a') {
        e.preventDefault();
        setIsAmbilightEnabled((prev) => !prev);
      }
      // H: Host Controls
      else if (key === 'h' && isHost) {
        e.preventDefault();
        setIsHostControlsOpen((prev) => !prev);
      }
      // I: Copy Invite Link
      else if (key === 'i') {
        e.preventDefault();
        handleCopyInviteLink();
      }
      // ?: Shortcuts Cheatsheet
      else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      // Space Release: Push-to-Talk Mute
      if (e.code === 'Space') {
        e.preventDefault();
        if (spaceTalkActiveRef.current) {
          spaceTalkActiveRef.current = false;
          if (isMicActive) {
            onToggleMic();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isMicActive,
    isCameraActive,
    isCameraMirrored,
    onToggleMic,
    onToggleCamera,
    onToggleCameraMirror,
    onOpenSettings,
    isShortcutsModalOpen,
    isDrmGuideOpen,
    isEmojiTrayOpen,
    isHostControlsOpen,
    isChatOpen,
    isHost
  ]);

  const totalUsersInRoom = participants.length;
  const hasActiveMedia = Boolean(mediaStream || localFileUrl || (mediaMode === 'youtube' && youtubeVideoId));

  // Determine which participant is pinned
  const pinnedParticipant = pinnedFeedId && pinnedFeedId !== 'screen'
    ? participants.find((p) => p.id === pinnedFeedId)
    : null;

  return (
    <div
      ref={mainStageContainerRef}
      className="relative w-screen h-screen bg-black overflow-hidden flex flex-col font-sans select-none text-[#1D1D1F] dark:text-[#F5F5F7]"
    >
      {/* Top Floating Navigation Header */}
      <header
        className={`transition-all duration-300 z-40 ${
          isFullscreen
            ? `absolute top-0 inset-x-0 h-14 sm:h-16 px-3 sm:px-6 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2 ${
                isControlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
              }`
            : 'h-14 sm:h-16 px-3 sm:px-6 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0 relative gap-2'
        }`}
      >
        {/* Room Info */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <SynLogo size={22} className="sm:w-7 sm:h-7 shrink-0" />
          <div className="h-4 w-px bg-black/10 dark:bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[#1D1D1F] dark:text-[#F5F5F7] text-xs sm:text-sm font-bold truncate max-w-[70px] min-[380px]:max-w-[100px] sm:max-w-[180px] md:max-w-[240px]" title={roomName}>
              {roomName}
            </span>
            <span className="px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] shrink-0">
              {isHost ? 'Host' : 'Viewer'}
            </span>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium bg-black/[0.04] dark:bg-white/[0.06] text-black/65 dark:text-white/65 border border-black/[0.06] dark:border-white/[0.08] select-all shrink-0" title="Watchroom Code">
              {formatRoomCode(roomId)}
            </span>
            <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1 shrink-0">
              <MeshNetworkIcon size={11} className="text-black/55 dark:text-white/55" />
              <span>{totalUsersInRoom}/4</span>
            </span>
          </div>
        </div>

        {/* Live Meeting Clock (12-Hour Format) - Hidden on mobile phones to prevent header collisions */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] select-none shrink-0 shadow-2xs">
          <Clock size={12} className="text-[var(--accent)] shrink-0" />
          <span className="tabular-nums font-mono text-[11px] sm:text-xs tracking-tight">{currentTime}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handleCopyInviteLink}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer"
            title="Copy watchroom link (I)"
          >
            {copiedLink ? <CheckCircle2 size={14} className="text-[#30D158]" /> : <Share2 size={14} />}
            <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Layout Mode Switcher - Desktop & Tablet only */}
          <div className="hidden sm:flex gap-0.5 sm:gap-1 bg-black/[0.03] dark:bg-white/[0.04] p-0.5 sm:p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
            <button
              onClick={() => setLayout('theater')}
              className={`p-1 sm:p-1.5 rounded-lg transition duration-150 cursor-pointer ${
                layout === 'theater'
                  ? 'bg-black/[0.08] dark:bg-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'text-black/30 dark:text-white/30 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
              title="Theater View"
            >
              <TheaterLayoutIcon size={15} />
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={`p-1 sm:p-1.5 rounded-lg transition duration-150 cursor-pointer ${
                layout === 'grid'
                  ? 'bg-black/[0.08] dark:bg-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'text-black/30 dark:text-white/30 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
              title="Grid View"
            >
              <GridLayoutIcon size={15} />
            </button>
            <button
              onClick={() => setLayout('floating')}
              className={`p-1 sm:p-1.5 rounded-lg transition duration-150 cursor-pointer ${
                layout === 'floating'
                  ? 'bg-black/[0.08] dark:bg-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'text-black/30 dark:text-white/30 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
              title="Floating View"
            >
              <FloatingLayoutIcon size={15} />
            </button>
          </div>

          {/* Shortcuts Quick Button - Desktop only */}
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="hidden md:flex p-1.5 sm:p-2 rounded-xl border bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border-black/[0.06] dark:border-white/[0.08] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition cursor-pointer"
            title="Keyboard Shortcuts (?)"
          >
            <Command size={15} />
          </button>

          {/* Chat Toggle */}
          <button
            type="button"
            onClick={toggleChat}
            className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer relative ${
              isChatOpen
                ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border-black/[0.06] dark:border-white/[0.08] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
            }`}
            title="Room Chat (C)"
            aria-label="Toggle chat sidebar"
          >
            <MessageSquare size={15} />
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF453A] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-black">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </button>

          {/* Settings Toggle */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 rounded-xl border bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border-black/[0.06] dark:border-white/[0.08] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition cursor-pointer"
              title="Pipeline Settings & Live Diagnostics (S)"
              aria-label="Settings"
            >
              <Settings size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Main Cinema Viewport */}
      <main className="flex-1 relative flex flex-col md:flex-row overflow-hidden bg-black">
        {hasActiveMedia ? (
          /* State 1: Active Screen Share or Local File Media */
          <>
            {/* Left: Dominant Cinema Viewport (4:1 Ratio in Fullscreen) */}
            <div
              className={`group flex-1 ${
                isFullscreen ? 'md:flex-[5] lg:flex-[6]' : 'md:flex-[3] lg:flex-[4]'
              } h-full relative flex items-center justify-center bg-black overflow-hidden min-w-0 [isolation:isolate] [transform:translateZ(0)]`}
            >
              {/* Dynamic Cinema Ambilight Glow */}
              <AmbilightGlow
                videoElement={mainVideoRef.current}
                isEnabled={isAmbilightEnabled && !pinnedParticipant}
              />

              {/* If a participant's camera feed is pinned, display them large here */}
              {pinnedParticipant ? (
                <StreamVideoPlayer
                  stream={pinnedParticipant.stream}
                  isCamera={true}
                  isMuted={true}
                  volume={0}
                  isMirrored={pinnedParticipant.isMirrored ?? pinnedParticipant.isSelf}
                  className="object-contain max-h-full"
                />
              ) : mediaMode === 'youtube' && youtubeVideoId ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  <YouTubeSyncPlayer
                    videoId={youtubeVideoId}
                    isHost={isHost}
                    syncState={youtubeSyncState || null}
                    onSyncAction={onYouTubeSyncAction}
                  />
                </div>
              ) : localFileUrl ? (
                <StreamVideoPlayer
                  src={localFileUrl}
                  controls
                  className="object-contain max-h-full"
                  onMount={(el) => {
                    mainVideoRef.current = el;
                    if (videoRefCallback) videoRefCallback(el);
                  }}
                />
              ) : mediaStream ? (
                <StreamVideoPlayer
                  stream={mediaStream}
                  isCamera={false}
                  isMuted={isSharingScreen ? true : mainVideoMuted}
                  volume={mainVideoVolume}
                  className="object-contain max-h-full"
                  onMount={(el) => {
                    mainVideoRef.current = el;
                    if (videoRefCallback) videoRefCallback(el);
                  }}
                />
              ) : null}

              {/* Feed Pinning Controls & Protected Content Help */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                {pinnedParticipant ? (
                  <button
                    type="button"
                    onClick={() => setPinnedFeedId(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] text-black text-xs font-bold shadow-lg hover:opacity-90 transition cursor-pointer"
                    title="Unpin feed to return to shared cinema stream (P)"
                  >
                    <PinOff size={14} />
                    <span>Pinned: {pinnedParticipant.name} (Click to Unpin)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPinnedFeedId((prev) => (prev === 'screen' ? null : 'screen'))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-semibold transition cursor-pointer ${
                      pinnedFeedId === 'screen'
                        ? 'bg-[var(--accent)] text-black border-[var(--accent)] opacity-100 shadow-lg'
                        : 'bg-black/60 text-white/90 border-white/15 opacity-0 group-hover:opacity-100 hover:bg-black/80'
                    }`}
                    title={pinnedFeedId === 'screen' ? 'Unpin Screen Feed (P)' : 'Pin Screen Feed (P)'}
                  >
                    {pinnedFeedId === 'screen' ? <PinOff size={14} /> : <Pin size={14} />}
                    <span>{pinnedFeedId === 'screen' ? 'Pinned' : 'Pin Feed'}</span>
                  </button>
                )}

                {/* Hotstar / Netflix DRM black screen helper */}
                {isSharingScreen && !pinnedParticipant && (
                  <button
                    type="button"
                    onClick={() => setIsDrmGuideOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-medium backdrop-blur-md hover:bg-amber-500/35 transition cursor-pointer"
                    title="Having black screen on Hotstar or Netflix? Click for 10-second fix"
                  >
                    <HelpCircle size={13} />
                    <span className="hidden sm:inline">Black Screen on Hotstar/Netflix?</span>
                  </button>
                )}
              </div>

              {/* Movie Audio Track Slider - Automatically muted on presenter screen to eliminate double audio echo */}
              {mediaStream && !pinnedParticipant && (
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] px-3.5 py-2 rounded-2xl flex items-center gap-2.5 shadow-sm z-20">
                  {isSharingScreen ? (
                    <div
                      className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-medium"
                      title="Audio is muted locally for you to prevent double sound and acoustic mic echo. Viewers hear your stream clearly."
                    >
                      <VolumeX size={15} />
                      <span className="hidden sm:inline text-[11px]">Audio muted locally (echo prevention)</span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setMainVideoMuted(!mainVideoMuted)}
                        className="text-black/55 dark:text-white/55 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition cursor-pointer"
                      >
                        {mainVideoMuted || mainVideoVolume === 0 ? (
                          <VolumeX size={15} className="text-[#FF453A]" />
                        ) : (
                          <Volume2 size={15} />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={mainVideoMuted ? 0 : mainVideoVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setMainVideoVolume(val);
                          if (mainVideoRef.current) mainVideoRef.current.volume = val;
                        }}
                        className="w-20 h-1 accent-black/30 dark:accent-white/30 cursor-pointer"
                        title="Media Stream Volume"
                      />
                    </>
                  )}
                </div>
              )}

              {/* Picture in Picture & Fullscreen Action Pill */}
              <div className="absolute bottom-5 right-5 flex items-center gap-2 z-20">
                <button
                  onClick={togglePictureInPicture}
                  className="p-2.5 bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-black/55 dark:text-white/55 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded-xl border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl transition cursor-pointer"
                  title="Picture in Picture"
                >
                  <PictureInPicture2 size={16} />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2.5 bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-black/55 dark:text-white/55 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded-xl border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl transition cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen (F / Esc)' : 'Fullscreen (F)'}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>

            {/* Right: Participant Cameras (Responsive mobile bottom drawer, desktop vertical sidebar) */}
            {layout === 'theater' && participants.length > 0 && (
              <aside
                className={`w-full ${
                  isFullscreen ? 'md:w-52 lg:w-60' : 'md:w-72 lg:w-80 xl:w-96'
                } h-28 sm:h-36 md:h-full bg-white/95 dark:bg-black/95 backdrop-blur-xl md:border-l md:border-t-0 border-t border-black/[0.06] dark:border-white/[0.06] p-2 sm:p-3 overflow-x-auto md:overflow-y-auto flex md:flex-col flex-row gap-2 sm:gap-3 shrink-0 z-20`}
              >
                <div className="hidden md:flex items-center justify-between text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1 px-1">
                  <span className="flex items-center gap-2 uppercase tracking-wide text-[11px] text-black/55 dark:text-white/55">
                    <Sliders size={13} className="text-black/55 dark:text-white/55" />
                    <span>Participants ({participants.length})</span>
                  </span>
                </div>

                {participants.map((p) => {
                  const hasVideo = Boolean(
                    p.stream &&
                    p.stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
                  );

                  return (
                    <div
                      key={p.id}
                      className="group relative w-32 min-[380px]:w-36 sm:w-48 md:w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black dark:bg-black border border-black/10 dark:border-white/10 [isolation:isolate] [transform:translateZ(0)] [mask-image:-webkit-radial-gradient(white,black)] shrink-0 shadow-sm"
                    >
                      {/* Video Layer */}
                      {hasVideo ? (
                        <StreamVideoPlayer
                          stream={p.stream}
                          isCamera={true}
                          isMuted={true}
                          volume={0}
                          isMirrored={p.isMirrored ?? p.isSelf}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-xs sm:text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-black/45 dark:text-white/45 font-medium">Camera off</span>
                        </div>
                      )}

                      {/* Video Feed Controls on Hover (Pin & Background Blur) */}
                      <TileActionControls
                        participant={p}
                        isPinned={pinnedFeedId === p.id}
                        onTogglePin={() => setPinnedFeedId((prev) => (prev === p.id ? null : p.id))}
                        bgBlurRadius={bgBlurRadius}
                        onSetBlurRadius={onSetBlurRadius}
                        size="sm"
                      />

                      {/* Floating Bottom-Left Pill: Name & YOU (No border-t intersection = 0 dead pixels) */}
                      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-white pointer-events-none shadow-sm">
                        <span className="text-[11px] font-bold truncate max-w-[80px] sm:max-w-[100px]" title={p.name}>
                          {p.name}
                        </span>
                        {p.isSelf && (
                          <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-white/20 text-white font-bold shrink-0">
                            YOU
                          </span>
                        )}
                      </div>

                      {/* Floating Bottom-Right Pill: Mic Status & Peer Volume */}
                      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-white shadow-sm">
                        {p.isSelf ? (
                          p.isMicActive ? (
                            <span className="text-[#30D158]"><LiquidMicIcon size={12} /></span>
                          ) : (
                            <span className="text-[#FF453A]"><LiquidMicOffIcon size={12} /></span>
                          )
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleMutePeer(p.id)}
                              className="text-white/75 hover:text-white p-0.5 transition cursor-pointer"
                              title={mutedPeers[p.id] ? 'Unmute participant' : 'Mute participant'}
                            >
                              {mutedPeers[p.id] ? <VolumeX size={12} className="text-[#FF453A]" /> : <Volume2 size={12} />}
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={mutedPeers[p.id] ? 0 : volumes[p.id] ?? 0.8}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setVolumes((prev) => ({ ...prev, [p.id]: val }));
                              }}
                              className="hidden md:block w-12 h-1 accent-[var(--accent)] cursor-pointer"
                              title="Peer Volume"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </aside>
            )}
          </>
        ) : (
          /* State 2: Screen Cast is OFF (Symmetrical Full Stage Camera Feed Coverage) */
          <div className="flex-1 w-full h-full relative flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 overflow-hidden bg-white dark:bg-black">
            {/* Top Standby Notification Pill */}
            <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-20">
              <div className="pointer-events-auto px-4 py-1.5 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.1] text-xs text-black/65 dark:text-white/65 flex items-center gap-2 shadow-sm">
                <ScreenCastIcon size={14} className="text-[var(--accent)]" />
                <span>
                  {isHost
                    ? 'Standby • Click "Broadcast" below to stream media'
                    : 'Standby • Awaiting host broadcast'}
                </span>
              </div>
            </div>

            {/* Symmetrical Stage Coverage or Spotlight Pinned View */}
            <div
              className={`w-full h-full max-h-[84vh] mx-auto grid gap-3 sm:gap-6 items-center justify-center ${
                pinnedParticipant || participants.length <= 1
                  ? 'grid-cols-1 max-w-5xl'
                  : participants.length === 2
                  ? 'grid-cols-1 md:grid-cols-2 max-w-6xl'
                  : 'grid-cols-2 max-w-6xl'
              }`}
            >
              {(pinnedParticipant ? [pinnedParticipant] : participants).map((p) => {
                const hasVideo = Boolean(
                  p.stream &&
                  p.stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
                );

                return (
                  <div
                    key={p.id}
                    className="group relative w-full h-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-black dark:bg-black border border-black/10 dark:border-white/10 [isolation:isolate] [transform:translateZ(0)] [mask-image:-webkit-radial-gradient(white,black)] shadow-2xl flex items-center justify-center"
                  >
                    {hasVideo ? (
                      <StreamVideoPlayer
                        stream={p.stream}
                        isCamera={true}
                        isMuted={true}
                        volume={0}
                        isMirrored={p.isMirrored ?? p.isSelf}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40">
                        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-xl sm:text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-black/50 dark:text-white/50 font-medium">Camera off</span>
                      </div>
                    )}

                    {/* Standby tile action controls (Pin & Background Blur) */}
                    <TileActionControls
                      participant={p}
                      isPinned={pinnedFeedId === p.id}
                      onTogglePin={() => setPinnedFeedId((prev) => (prev === p.id ? null : p.id))}
                      bgBlurRadius={bgBlurRadius}
                      onSetBlurRadius={onSetBlurRadius}
                      size="md"
                    />

                    {/* Bottom Floating Pill Overlays */}
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-white pointer-events-none shadow-sm">
                      <span className="text-xs sm:text-sm font-semibold truncate max-w-[140px] sm:max-w-[200px]">
                        {p.name} {p.isSelf && '(You)'}
                      </span>
                      {p.isMicActive ? (
                        <span className="p-1 rounded-md bg-[#30D158]/20 text-[#30D158]">
                          <LiquidMicIcon size={12} />
                        </span>
                      ) : (
                        <span className="p-1 rounded-md bg-[#FF453A]/20 text-[#FF453A]">
                          <LiquidMicOffIcon size={12} />
                        </span>
                      )}
                    </div>

                    {!p.isSelf && (
                      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => toggleMutePeer(p.id)}
                          className="text-white/75 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                          title={mutedPeers[p.id] ? 'Unmute participant' : 'Mute participant'}
                        >
                          {mutedPeers[p.id] ? <VolumeX size={15} className="text-[#FF453A]" /> : <Volume2 size={15} />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={mutedPeers[p.id] ? 0 : volumes[p.id] ?? 0.8}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVolumes((prev) => ({ ...prev, [p.id]: val }));
                          }}
                          className="w-16 sm:w-24 h-1 accent-[var(--accent)] cursor-pointer"
                          title="Peer Volume"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Standby Local File Selector for Host */}
            {isHost && mediaMode === 'local_file' && (
              <div className="absolute bottom-20 sm:bottom-24 inset-x-0 flex justify-center pointer-events-none z-20">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onSelectLocalFile(file);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="pointer-events-auto px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-semibold text-xs transition flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <CinemaReelIcon size={16} />
                  <span>Choose Video File to Broadcast</span>
                </button>
              </div>
            )}

            {/* Fullscreen Button */}
            <div className="absolute bottom-5 right-5 flex items-center gap-2 z-20">
              <button
                onClick={toggleFullscreen}
                className="p-2.5 bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-black/55 dark:text-white/55 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded-xl border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl transition cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen (F / Esc)' : 'Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Grid View Layout */}
        {layout === 'grid' && participants.length > 0 && (
          <div className="absolute inset-x-3 sm:inset-x-6 bottom-20 sm:bottom-24 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 z-30 pointer-events-none">
            {participants.map((p) => {
              const hasVideo = Boolean(
                p.stream &&
                p.stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
              );

              return (
                <div
                  key={p.id}
                  className="group pointer-events-auto aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black dark:bg-black border border-black/10 dark:border-white/10 [isolation:isolate] [transform:translateZ(0)] [mask-image:-webkit-radial-gradient(white,black)] relative shadow-md"
                >
                  {hasVideo ? (
                    <StreamVideoPlayer
                      stream={p.stream}
                      isCamera={true}
                      isMuted={true}
                      volume={0}
                      isMirrored={p.isMirrored ?? p.isSelf}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-xs sm:text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-black/45 dark:text-white/45 font-medium">Camera off</span>
                    </div>
                  )}

                  {/* Grid tile action controls (Pin & Background Blur) */}
                  <TileActionControls
                    participant={p}
                    isPinned={pinnedFeedId === p.id}
                    onTogglePin={() => setPinnedFeedId((prev) => (prev === p.id ? null : p.id))}
                    bgBlurRadius={bgBlurRadius}
                    onSetBlurRadius={onSetBlurRadius}
                    size="sm"
                  />

                  <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-white pointer-events-none shadow-sm">
                    <span className="text-[#1D1D1F] dark:text-[#F5F5F7] text-[11px] sm:text-xs font-bold truncate">
                      {p.name}
                    </span>
                  </div>

                  {!p.isSelf && (
                    <div className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-white shadow-sm">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={mutedPeers[p.id] ? 0 : volumes[p.id] ?? 0.8}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setVolumes((prev) => ({ ...prev, [p.id]: val }));
                        }}
                        className="w-12 h-1 accent-[var(--accent)] cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Draggable Viewports */}
        {hasActiveMedia &&
          layout === 'floating' &&
          participants.map((p, idx) => (
            <DraggableTile
              key={p.id}
              participant={{
                id: p.id,
                name: p.name,
                stream: p.stream,
                isMicActive: p.isMicActive,
                isSelf: p.isSelf,
                isMirrored: p.isMirrored
              }}
              initialX={typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 280) : 24}
              initialY={80 + idx * 170}
            />
          ))}

        {/* Room Chat Drawer */}
        {childrenChat && isChatOpen && (
          <div className="fixed md:relative inset-y-0 right-0 w-full sm:w-80 h-full shrink-0 z-50">
            {React.isValidElement(childrenChat)
              ? React.cloneElement(childrenChat as React.ReactElement<any>, {
                  onClose: closeChat,
                  isOpen: isChatOpen
                })
              : childrenChat}
          </div>
        )}
      </main>

      {/* Bottom Liquid Glass Control Dock (Auto-hiding and Icon-only in Fullscreen to eliminate distractions) */}
      <footer
        className={`transition-all duration-300 z-40 ${
          isFullscreen
            ? `absolute bottom-0 inset-x-0 h-16 sm:h-18 px-3 sm:px-8 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2 ${
                isControlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
              }`
            : 'h-16 sm:h-18 px-3 sm:px-6 md:px-8 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0 relative gap-2'
        }`}
      >
        {/* Left Side: Room Identity / Balanced Spacer */}
        <div className="hidden md:flex items-center gap-2 min-w-0 w-36 shrink-0">
          <span className="text-xs font-semibold text-black/60 dark:text-white/60 truncate" title={roomName}>
            {roomName}
          </span>
        </div>

        {/* Center: Compact Floating Controls Dock */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 py-1 overflow-visible">
            {/* Studio Microphone Split Control */}
            <div ref={micPopup.triggerRef} className="relative flex items-center shrink-0">
              <div
                className={`flex items-center rounded-xl sm:rounded-2xl border transition min-h-[40px] overflow-hidden ${
                  isMicActive
                    ? 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/25 hover:bg-[#30D158]/20'
                    : 'bg-[#FF453A]/15 text-[#FF453A] border-[#FF453A]/25 hover:bg-[#FF453A]/20'
                }`}
              >
                <button
                  type="button"
                  onClick={onToggleMic}
                  className="p-2.5 sm:px-3 sm:py-2.5 flex items-center justify-center transition hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  title={isMicActive ? 'Mute Microphone (M / Hold Space to talk)' : 'Unmute Microphone (M / Hold Space to talk)'}
                >
                  {isMicActive ? <LiquidMicIcon size={16} /> : <LiquidMicOffIcon size={16} />}
                </button>
                {onSelectAudioInputDevice && audioInputDevices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMicMenuOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          setIsCameraMenuOpen(false);
                          setIsBlurMenuOpen(false);
                          setIsBroadcastMenuOpen(false);
                          setIsEmojiTrayOpen(false);
                          setIsHostControlsOpen(false);
                        }
                        return next;
                      });
                    }}
                    className="px-1.5 py-2.5 border-l border-current/20 flex items-center justify-center transition hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer text-current"
                    title="Select Microphone"
                  >
                    <ChevronUp size={12} className={`transition-transform duration-200 ${isMicMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Mic Device Selector Dropdown (Portal) */}
              <PopupPortal
                ref={micPopup.popupRef}
                isOpen={isMicMenuOpen && !!onSelectAudioInputDevice}
                style={micPopup.popupStyle}
                caretLeft={micPopup.caretLeft}
                isFlipped={micPopup.isFlipped}
                className="max-h-72 overflow-y-auto space-y-1"
              >
                <div className="px-3 py-1 text-[10px] font-semibold text-black/50 dark:text-white/50 tracking-wider uppercase">
                  Select Microphone
                </div>
                {audioInputDevices.map((device, idx) => (
                  <button
                    key={device.deviceId || idx}
                    type="button"
                    onClick={() => {
                      onSelectAudioInputDevice!(device.deviceId);
                      setIsMicMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                      selectedAudioDeviceId === device.deviceId
                        ? 'bg-[var(--accent)] text-black font-semibold shadow-xs'
                        : 'text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <span className="truncate pr-2">{device.label || `Microphone ${idx + 1}`}</span>
                    {selectedAudioDeviceId === device.deviceId && <Check size={14} className="shrink-0 text-black" />}
                  </button>
                ))}
              </PopupPortal>
            </div>

          {/* Studio Camera Split Control */}
          {onToggleCamera && (
            <div ref={cameraPopup.triggerRef} className="relative flex items-center shrink-0">
              <div
                className={`flex items-center rounded-xl sm:rounded-2xl border transition min-h-[40px] overflow-hidden ${
                  isCameraActive
                    ? 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/25 hover:bg-[#30D158]/20'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
                }`}
              >
                <button
                  type="button"
                  onClick={onToggleCamera}
                  className="p-2.5 sm:px-3 sm:py-2.5 flex items-center justify-center transition hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  title={isCameraActive ? 'Turn Off Camera (O)' : 'Turn On Camera (O)'}
                >
                  {isCameraActive ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
                {onSelectVideoInputDevice && videoInputDevices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCameraMenuOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          setIsMicMenuOpen(false);
                          setIsBlurMenuOpen(false);
                          setIsBroadcastMenuOpen(false);
                          setIsEmojiTrayOpen(false);
                          setIsHostControlsOpen(false);
                        }
                        return next;
                      });
                    }}
                    className="px-1.5 py-2.5 border-l border-current/20 flex items-center justify-center transition hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer text-current"
                    title="Select Camera"
                  >
                    <ChevronUp size={12} className={`transition-transform duration-200 ${isCameraMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Camera Device Selector Dropdown (Portal) */}
              <PopupPortal
                ref={cameraPopup.popupRef}
                isOpen={isCameraMenuOpen && !!onSelectVideoInputDevice}
                style={cameraPopup.popupStyle}
                caretLeft={cameraPopup.caretLeft}
                isFlipped={cameraPopup.isFlipped}
                className="max-h-72 overflow-y-auto space-y-1"
              >
                <div className="px-3 py-1 text-[10px] font-semibold text-black/50 dark:text-white/50 tracking-wider uppercase">
                  Select Camera
                </div>
                {videoInputDevices.map((device, idx) => (
                  <button
                    key={device.deviceId || idx}
                    type="button"
                    onClick={() => {
                      onSelectVideoInputDevice!(device.deviceId);
                      setIsCameraMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                      selectedVideoDeviceId === device.deviceId
                        ? 'bg-[var(--accent)] text-black font-semibold shadow-xs'
                        : 'text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <span className="truncate pr-2">{device.label || `Camera ${idx + 1}`}</span>
                    {selectedVideoDeviceId === device.deviceId && <Check size={14} className="shrink-0 text-black" />}
                  </button>
                ))}
              </PopupPortal>
            </div>
          )}

          {/* Mirror Camera Mode Toggle */}
          {onToggleCameraMirror && (
            <button
              onClick={() => onToggleCameraMirror(!isCameraMirrored)}
              className={`hidden sm:flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                isCameraMirrored
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25 hover:bg-[var(--accent)]/20'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
              }`}
              title={isCameraMirrored ? 'Disable Mirror Mode (\\)' : 'Enable Mirror Mode (\\)'}
            >
              <FlipHorizontal size={16} />
            </button>
          )}

          {/* Background Blur Toggle & Popover */}
          {onSetBlurRadius && (
            <div ref={blurPopup.triggerRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsBlurMenuOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setIsMicMenuOpen(false);
                      setIsCameraMenuOpen(false);
                      setIsBroadcastMenuOpen(false);
                      setIsEmojiTrayOpen(false);
                      setIsHostControlsOpen(false);
                    }
                    return next;
                  });
                }}
                className={`flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                  bgBlurRadius > 0
                    ? 'bg-[var(--accent)] text-black font-semibold border border-[var(--accent)] shadow-sm'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
                }`}
                title={bgBlurRadius > 0 ? `Background Blur Active (${bgBlurRadius}px)` : 'Background Blur (Off)'}
              >
                <Aperture size={16} />
              </button>

              {/* Blur Popover (Portal) */}
              <PopupPortal
                ref={blurPopup.popupRef}
                isOpen={isBlurMenuOpen}
                style={blurPopup.popupStyle}
                caretLeft={blurPopup.caretLeft}
                isFlipped={blurPopup.isFlipped}
                className="space-y-3 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-black dark:text-white">Background Blur</span>
                  <span className="text-[11px] font-mono text-[var(--accent)] font-semibold">
                    {bgBlurRadius === 0 ? 'Off' : `${bgBlurRadius}px`}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Off', val: 0 },
                    { label: 'Subtle', val: 8 },
                    { label: 'Portrait', val: 16 },
                    { label: 'Deep', val: 24 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => onSetBlurRadius(preset.val)}
                      className={`py-1.5 text-[10px] font-medium rounded-lg transition cursor-pointer text-center ${
                        bgBlurRadius === preset.val
                          ? 'bg-[var(--accent)] text-black font-bold shadow-xs'
                          : 'bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/15 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Continuous Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-black/50 dark:text-white/50">
                    <span>Intensity</span>
                    <span>{Math.round((bgBlurRadius / 32) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={32}
                    value={bgBlurRadius}
                    onChange={(e) => onSetBlurRadius(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-black/15 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                </div>

                <div className="text-[10px] text-black/50 dark:text-white/50 leading-snug">
                  Edge-refined portrait bokeh with sub-pixel feathering
                </div>
              </PopupPortal>
            </div>
          )}

          {/* Unified Screen Cast / Broadcast Control */}
          {isHost && (
            <div ref={broadcastPopup.triggerRef} className="relative shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onSelectLocalFile(file);
                    setIsBroadcastMenuOpen(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsBroadcastMenuOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setBroadcastView(isBroadcastingActive ? 'active_manage' : 'sources');
                      setYoutubeError(null);
                      setIsMicMenuOpen(false);
                      setIsCameraMenuOpen(false);
                      setIsBlurMenuOpen(false);
                      setIsEmojiTrayOpen(false);
                      setIsHostControlsOpen(false);
                    }
                    return next;
                  });
                }}
                className={`flex items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                  isBroadcastingActive
                    ? 'bg-[var(--accent)] text-black border border-[var(--accent)] shadow-[0_0_15px_rgba(200,169,126,0.35)]'
                    : 'bg-[#8B7355] dark:bg-[#C8A97E] text-white dark:text-black hover:opacity-90'
                }`}
                title={isBroadcastingActive ? `Active Broadcast: ${activeBroadcastLabel}` : 'Screen Cast / Broadcast Media'}
              >
                <ScreenCastIcon size={16} />
                <span className="hidden sm:inline">
                  {isBroadcastingActive ? activeBroadcastLabel : 'Broadcast'}
                </span>
              </button>

              {/* Anchored Broadcast Popover (Portal) */}
              <PopupPortal
                ref={broadcastPopup.popupRef}
                isOpen={isBroadcastMenuOpen}
                style={broadcastPopup.popupStyle}
                caretLeft={broadcastPopup.caretLeft}
                isFlipped={broadcastPopup.isFlipped}
                widthClass="w-72"
                className="p-3.5"
              >
                  {broadcastView === 'sources' && (
                    <div className="space-y-2">
                      <div className="px-1 pb-1 border-b border-black/[0.08] dark:border-white/10">
                        <div className="text-xs font-semibold text-black dark:text-white">Broadcast Source</div>
                        <div className="text-[10px] text-black/50 dark:text-white/50">Select media to stream to the room</div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsBroadcastMenuOpen(false);
                            onToggleScreenShare();
                          }}
                          className="w-full p-2 rounded-xl flex items-center gap-3 text-left hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-black transition shrink-0">
                            <ScreenCastIcon size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-black dark:text-white group-hover:text-[var(--accent)]">Screen Cast</div>
                            <div className="text-[10px] text-black/50 dark:text-white/50 truncate">Share display, app window, or tab</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setBroadcastView('youtube_input');
                            setYoutubeError(null);
                          }}
                          className="w-full p-2 rounded-xl flex items-center gap-3 text-left hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#FF0000] group-hover:bg-[#FF0000] group-hover:text-white transition shrink-0">
                            <Youtube size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-black dark:text-white group-hover:text-[#FF0000]">YouTube Stream</div>
                            <div className="text-[10px] text-black/50 dark:text-white/50 truncate">Synchronized CDN video playback</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsBroadcastMenuOpen(false);
                            fileInputRef.current?.click();
                          }}
                          className="w-full p-2 rounded-xl flex items-center gap-3 text-left hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-black transition shrink-0">
                            <CinemaReelIcon size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-black dark:text-white group-hover:text-[var(--accent)]">Local Media File</div>
                            <div className="text-[10px] text-black/50 dark:text-white/50 truncate">MP4, WebM, or MKV video file</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {broadcastView === 'youtube_input' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-black/[0.08] dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => setBroadcastView(isBroadcastingActive ? 'active_manage' : 'sources')}
                          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition cursor-pointer"
                        >
                          <ArrowLeft size={14} />
                        </button>
                        <div className="text-xs font-semibold text-black dark:text-white">Broadcast YouTube</div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-black/60 dark:text-white/60 block">YouTube Video URL or Video ID</label>
                        <input
                          type="text"
                          value={youtubeInputUrl}
                          onChange={(e) => {
                            setYoutubeInputUrl(e.target.value);
                            setYoutubeError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleStartYouTubeSubmit();
                          }}
                          placeholder="https://youtube.com/watch?v=..."
                          className="w-full px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 focus:outline-none focus:border-[var(--accent)]"
                          autoFocus
                        />
                        {youtubeError && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#FF453A]">
                            <AlertCircle size={12} className="shrink-0" />
                            <span>{youtubeError}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleStartYouTubeSubmit}
                        className="w-full py-2 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-xs"
                      >
                        Start Broadcast
                      </button>
                    </div>
                  )}

                  {broadcastView === 'active_manage' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-black/[0.08] dark:border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
                          <span className="text-xs font-semibold text-black dark:text-white">Broadcasting</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[var(--accent)] font-semibold">
                          {activeBroadcastLabel}
                        </span>
                      </div>

                      <div className="text-[11px] text-black/70 dark:text-white/70 leading-relaxed">
                        Currently broadcasting live to room participants.
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleStopBroadcast}
                          className="w-full py-2 rounded-xl bg-[#FF453A]/20 text-[#FF453A] border border-[#FF453A]/30 text-xs font-semibold hover:bg-[#FF453A]/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <LogOut size={13} />
                          <span>Stop Broadcast</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBroadcastView('sources')}
                          className="w-full py-2 rounded-xl bg-black/5 dark:bg-white/10 text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/15 hover:text-black dark:hover:text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Switch Source
                        </button>
                      </div>
                    </div>
                  )}
              </PopupPortal>
            </div>
          )}

          {/* Picture-in-Picture (PiP) Multitasking */}
          <button
            type="button"
            onClick={togglePictureInPicture}
            className={`hidden sm:flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
              isPiPActive
                ? 'bg-[var(--accent)] text-black border border-[var(--accent)]'
                : 'bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08]'
            }`}
            title="Picture-in-Picture Floating Window (Shift+P)"
          >
            <PictureInPicture2 size={16} />
          </button>

          {/* Dynamic Ambilight Quick Toggle */}
          <button
            type="button"
            onClick={() => setIsAmbilightEnabled((prev) => !prev)}
            className={`hidden sm:flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
              isAmbilightEnabled
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
            }`}
            title="Dynamic Cinema Ambilight Glow (A)"
          >
            <SunMedium size={16} className={isAmbilightEnabled ? 'text-amber-400' : ''} />
          </button>

          {/* Settings Trigger */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-bold bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer shrink-0 min-h-[40px]"
              title="Pipeline Settings & Diagnostics (S)"
            >
              <Settings size={16} />
            </button>
          )}

          {/* Emoji Reactions Trigger */}
          {onSendEmojiReaction && (
            <div ref={reactionsPopup.triggerRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEmojiTrayOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setIsMicMenuOpen(false);
                      setIsCameraMenuOpen(false);
                      setIsBlurMenuOpen(false);
                      setIsBroadcastMenuOpen(false);
                      setIsHostControlsOpen(false);
                    }
                    return next;
                  });
                }}
                className={`flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                  isEmojiTrayOpen
                    ? 'bg-[var(--accent)] text-black border border-[var(--accent)]'
                    : 'bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08]'
                }`}
                title="Cinema Emoji Reactions (R)"
              >
                <Smile size={16} />
              </button>

              <EmojiReactions
                isOpen={isEmojiTrayOpen}
                onClose={() => setIsEmojiTrayOpen(false)}
                onSendReaction={onSendEmojiReaction}
                activeReactions={activeReactions || []}
                triggerRef={reactionsPopup.triggerRef}
                popupRef={reactionsPopup.popupRef}
                popupStyle={reactionsPopup.popupStyle}
                caretLeft={reactionsPopup.caretLeft}
                isFlipped={reactionsPopup.isFlipped}
              />
            </div>
          )}

          {/* Host Controls Trigger (Only visible to host) */}
          {isHost && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsHostControlsOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setIsMicMenuOpen(false);
                      setIsCameraMenuOpen(false);
                      setIsBlurMenuOpen(false);
                      setIsBroadcastMenuOpen(false);
                      setIsEmojiTrayOpen(false);
                    }
                    return next;
                  });
                }}
                className={`flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                  isHostControlsOpen
                    ? 'bg-[#C8A97E] text-black border border-[#C8A97E]'
                    : 'bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08]'
                }`}
                title="Room Host Controls (H)"
              >
                <ShieldAlert size={16} />
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Right Dock Controls: Leave Room */}
        <div className="flex items-center justify-end gap-2 w-36 shrink-0">
          <button
            onClick={onLeaveRoom}
            className="flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-bold bg-[#FF453A]/10 hover:bg-[#FF453A]/20 text-[#FF453A] border border-[#FF453A]/20 transition cursor-pointer shrink-0 min-h-[40px]"
            title="Leave Watchroom"
          >
            <LogOut size={16} />
          </button>
        </div>
      </footer>

      {/* Host Controls Modal */}
      {isHost && (
        <HostControlsModal
          isOpen={isHostControlsOpen}
          onClose={() => setIsHostControlsOpen(false)}
          roomId={roomId}
          roomName={roomName}
          isRoomLocked={Boolean(isRoomLocked)}
          onToggleRoomLock={onToggleRoomLock || (() => {})}
          participants={participants}
          onMuteAll={onMuteAllViewers || (() => {})}
          onMuteParticipant={onMuteParticipant || (() => {})}
          onKickParticipant={onKickParticipant || (() => {})}
          onEndSessionForAll={onEndSessionForAll || (() => {})}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Hotstar / Netflix DRM Guide Modal */}
      <DrmGuideModal
        isOpen={isDrmGuideOpen}
        onClose={() => setIsDrmGuideOpen(false)}
      />

      {/* Watchroom Settings Modal */}
      {React.isValidElement(childrenSettings)
        ? React.cloneElement(childrenSettings as React.ReactElement<any>, {
            isAmbilightEnabled,
            onToggleAmbilight: setIsAmbilightEnabled,
            dialogueBoost,
            onSelectDialogueBoost: setDialogueBoost,
            nightMode,
            onToggleNightMode: setNightMode
          })
        : childrenSettings}

      {/* Dedicated Remote Audio Players (Decoupled from camera video elements to guarantee autoplay) */}
      {participants
        .filter((p) => !p.isSelf && p.stream && p.stream.getAudioTracks().length > 0)
        .map((p) => (
          <RemoteAudioPlayer
            key={`remote-audio-${p.id}`}
            peerId={p.id}
            stream={p.stream}
            isMuted={Boolean(mutedPeers[p.id])}
            volume={volumes[p.id] ?? 0.8}
          />
        ))}
    </div>
  );
};
