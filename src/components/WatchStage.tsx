import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DraggableTile } from './DraggableTile';
import { formatRoomCode } from '../lib/appwrite';
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
  FlipHorizontal
} from 'lucide-react';
import { EmojiReactions, type FloatingReaction } from './EmojiReactions';
import { SynEmojiId } from './icons/SynEmojiIcons';
import { HostControlsModal } from './HostControlsModal';
import { ShortcutsModal } from './ShortcutsModal';
import { DrmGuideModal } from './DrmGuideModal';

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
  mediaMode: 'screen' | 'local_file';
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
  isSharingScreen: boolean;
  onToggleMic: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare: () => void;
  onSelectLocalFile: (file: File) => void;
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
}

interface StreamVideoPlayerProps {
  stream?: MediaStream;
  src?: string;
  isMuted?: boolean;
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
 */
const StreamVideoPlayer: React.FC<StreamVideoPlayerProps> = React.memo(({
  stream,
  src,
  isMuted = false,
  volume = 1,
  isMirrored = false,
  className = '',
  controls = false,
  onMount
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.muted = isMuted;

      const attemptPlay = () => {
        video.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('Playback error encountered:', err);
          }
        });
      };

      attemptPlay();

      const handleTrackChange = () => {
        if (video.srcObject !== stream) {
          video.srcObject = stream;
        }
        attemptPlay();
      };

      stream.addEventListener('addtrack', handleTrackChange);
      stream.addEventListener('removetrack', handleTrackChange);

      return () => {
        stream.removeEventListener('addtrack', handleTrackChange);
        stream.removeEventListener('removetrack', handleTrackChange);
      };
    } else if (src) {
      if (video.src !== src) {
        video.src = src;
      }
    } else {
      video.srcObject = null;
    }
  }, [stream, src, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));
  }, [isMuted, volume]);

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
      muted={isMuted}
      className={`w-full h-full ${isMirrored ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
});

export const WatchStage: React.FC<WatchStageProps> = ({
  roomName,
  roomId,
  mediaMode,
  isHost,
  participants,
  mediaStream,
  localFileUrl,
  isMicActive,
  isCameraActive = false,
  isCameraMirrored = false,
  onToggleCameraMirror,
  isSharingScreen,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onSelectLocalFile,
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
  onSendEmojiReaction
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
      // P: Pin / Unpin Feed
      else if (key === 'p') {
        e.preventDefault();
        setPinnedFeedId((prev) => (prev ? null : 'screen'));
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

  const togglePictureInPicture = async () => {
    if (!mainVideoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await mainVideoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('Picture-in-Picture failed:', err);
    }
  };

  const totalUsersInRoom = participants.length;
  const hasActiveMedia = Boolean(mediaStream || localFileUrl);

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
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <SynLogo size={24} className="sm:w-7 sm:h-7 shrink-0" />
          <div className="h-4 w-px bg-black/10 dark:bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[#1D1D1F] dark:text-[#F5F5F7] text-xs sm:text-sm font-bold truncate max-w-[80px] min-[400px]:max-w-[120px] sm:max-w-[200px]" title={roomName}>
              {roomName}
            </span>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] shrink-0">
              {isHost ? 'Host' : 'Viewer'}
            </span>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium bg-black/[0.04] dark:bg-white/[0.06] text-black/65 dark:text-white/65 border border-black/[0.06] dark:border-white/[0.08] select-all shrink-0" title="Watchroom Code">
              {formatRoomCode(roomId)}
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1 shrink-0">
              <MeshNetworkIcon size={11} className="text-black/55 dark:text-white/55" />
              <span>{totalUsersInRoom}/4</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={handleCopyInviteLink}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer"
            title="Copy watchroom link (I)"
          >
            {copiedLink ? <CheckCircle2 size={14} className="text-[#30D158]" /> : <Share2 size={14} />}
            <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Layout Mode Switcher */}
          <div className="flex gap-0.5 sm:gap-1 bg-black/[0.03] dark:bg-white/[0.04] p-0.5 sm:p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
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

          {/* Shortcuts Quick Button */}
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl border bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border-black/[0.06] dark:border-white/[0.08] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition cursor-pointer"
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
              {/* If a participant's camera feed is pinned, display them large here */}
              {pinnedParticipant ? (
                <StreamVideoPlayer
                  stream={pinnedParticipant.stream}
                  isMuted={pinnedParticipant.isSelf || mutedPeers[pinnedParticipant.id]}
                  volume={pinnedParticipant.isSelf ? 0 : volumes[pinnedParticipant.id] ?? 0.8}
                  isMirrored={pinnedParticipant.isMirrored ?? pinnedParticipant.isSelf}
                  className="object-contain max-h-full"
                />
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

            {/* Right: Participant Cameras (Compact 4:1 layout in fullscreen, anti-aliased to prevent corner dead pixels) */}
            {layout === 'theater' && participants.length > 0 && (
              <aside
                className={`w-full ${
                  isFullscreen ? 'md:w-52 lg:w-60' : 'md:w-76 lg:w-80 xl:w-96'
                } h-36 sm:h-44 md:h-full bg-white/95 dark:bg-black/95 backdrop-blur-xl md:border-l md:border-t-0 border-t border-black/[0.06] dark:border-white/[0.06] p-2.5 sm:p-3 overflow-x-auto md:overflow-y-auto flex md:flex-col flex-row gap-2.5 sm:gap-3 shrink-0 z-20`}
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
                      className="group relative w-40 sm:w-48 md:w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black dark:bg-black border border-black/10 dark:border-white/10 [isolation:isolate] [transform:translateZ(0)] [mask-image:-webkit-radial-gradient(white,black)] shrink-0 shadow-sm"
                    >
                      {/* Video Layer */}
                      {hasVideo ? (
                        <StreamVideoPlayer
                          stream={p.stream}
                          isMuted={p.isSelf || mutedPeers[p.id]}
                          volume={p.isSelf ? 0 : volumes[p.id] ?? 0.8}
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

                      {/* Pin Feed Button on Hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPinnedFeedId((prev) => (prev === p.id ? null : p.id));
                        }}
                        className={`absolute top-2 right-2 z-20 p-1.5 rounded-lg backdrop-blur-md border transition cursor-pointer ${
                          pinnedFeedId === p.id
                            ? 'bg-[var(--accent)] text-black border-[var(--accent)] opacity-100 shadow-md'
                            : 'bg-black/60 text-white/80 border-white/15 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/80'
                        }`}
                        title={pinnedFeedId === p.id ? 'Unpin Feed (P)' : 'Pin Feed to Stage (P)'}
                      >
                        {pinnedFeedId === p.id ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>

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
                  {mediaMode === 'screen'
                    ? isHost
                      ? 'Screen Cast Standby • Click "Start Screen Cast" below to broadcast'
                      : 'Screen Cast Standby • Awaiting host broadcast'
                    : isHost
                    ? 'Local Video Standby • Choose a video file below to synchronize'
                    : 'Local Video Standby • Awaiting host video selection'}
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
                        isMuted={p.isSelf || mutedPeers[p.id]}
                        volume={p.isSelf ? 0 : volumes[p.id] ?? 0.8}
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

                    {/* Pin button on standby tile */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPinnedFeedId((prev) => (prev === p.id ? null : p.id));
                      }}
                      className={`absolute top-3 right-3 z-20 p-2 rounded-xl backdrop-blur-md border transition cursor-pointer ${
                        pinnedFeedId === p.id
                          ? 'bg-[var(--accent)] text-black border-[var(--accent)] opacity-100 shadow-md'
                          : 'bg-black/60 text-white/80 border-white/15 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/80'
                      }`}
                      title={pinnedFeedId === p.id ? 'Unpin Feed (P)' : 'Pin Feed to Stage (P)'}
                    >
                      {pinnedFeedId === p.id ? <PinOff size={15} /> : <Pin size={15} />}
                    </button>

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
                      isMuted={p.isSelf || mutedPeers[p.id]}
                      volume={p.isSelf ? 0 : volumes[p.id] ?? 0.8}
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

                  {/* Pin button on grid tile */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinnedFeedId((prev) => (prev === p.id ? null : p.id));
                    }}
                    className={`absolute top-2 right-2 z-20 p-1.5 rounded-lg backdrop-blur-md border transition cursor-pointer ${
                      pinnedFeedId === p.id
                        ? 'bg-[var(--accent)] text-black border-[var(--accent)] opacity-100 shadow-md'
                        : 'bg-black/60 text-white/80 border-white/15 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/80'
                    }`}
                    title={pinnedFeedId === p.id ? 'Unpin Feed (P)' : 'Pin Feed to Stage (P)'}
                  >
                    {pinnedFeedId === p.id ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>

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
        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar py-1">
          {/* Studio Microphone Toggle */}
          <button
            onClick={onToggleMic}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
              isFullscreen ? 'p-2.5 sm:p-3 rounded-xl' : 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl'
            } text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
              isMicActive
                ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/20 hover:bg-[#30D158]/25'
                : 'bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/20 hover:bg-[#FF453A]/25'
            }`}
            title={isMicActive ? 'Mute Microphone (M / Hold Space to talk)' : 'Unmute Microphone (M / Hold Space to talk)'}
          >
            {isMicActive ? <LiquidMicIcon size={16} /> : <LiquidMicOffIcon size={16} />}
            {!isFullscreen && <span className="hidden sm:inline">{isMicActive ? 'Mic Active' : 'Mic Muted'}</span>}
          </button>

          {/* Studio Camera Toggle */}
          {onToggleCamera && (
            <button
              onClick={onToggleCamera}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                isFullscreen ? 'p-2.5 sm:p-3 rounded-xl' : 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl'
              } text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                isCameraActive
                  ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/20 hover:bg-[#30D158]/25'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
              }`}
              title={isCameraActive ? 'Turn Off Camera (O)' : 'Turn On Camera (O)'}
            >
              {isCameraActive ? <Video size={16} /> : <VideoOff size={16} />}
              {!isFullscreen && <span className="hidden sm:inline">{isCameraActive ? 'Camera On' : 'Camera Off'}</span>}
            </button>
          )}

          {/* Mirror Camera Mode Toggle */}
          {onToggleCameraMirror && (
            <button
              onClick={() => onToggleCameraMirror(!isCameraMirrored)}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                isFullscreen ? 'p-2.5 sm:p-3 rounded-xl' : 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl'
              } text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                isCameraMirrored
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25 hover:bg-[var(--accent)]/20'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
              }`}
              title={isCameraMirrored ? 'Disable Mirror Mode (\\)' : 'Enable Mirror Mode (\\)'}
            >
              <FlipHorizontal size={16} />
              {!isFullscreen && <span className="hidden sm:inline">Mirror {isCameraMirrored ? 'On' : 'Off'}</span>}
            </button>
          )}

          {/* Screen Share Action (Host) */}
          {mediaMode === 'screen' && isHost && (
            <button
              onClick={onToggleScreenShare}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                isFullscreen ? 'p-2.5 sm:p-3 rounded-xl' : 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl'
              } text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                isSharingScreen
                  ? 'bg-[#8B7355]/15 dark:bg-[#C8A97E]/15 text-[#8B7355] dark:text-[#C8A97E] border border-[#8B7355]/20 dark:border-[#C8A97E]/20 hover:bg-[#8B7355]/25 dark:hover:bg-[#C8A97E]/25'
                  : 'bg-[#8B7355] dark:bg-[#C8A97E] text-white dark:text-black hover:opacity-90'
              }`}
              title={isSharingScreen ? 'Stop Screen Cast' : 'Start Screen Cast'}
            >
              <ScreenCastIcon size={16} />
              {!isFullscreen && (
                <span className="hidden sm:inline">
                  {isSharingScreen ? 'Stop Screen Cast' : 'Start Screen Cast'}
                </span>
              )}
            </button>
          )}

          {/* Select Video File (Local File Mode) */}
          {mediaMode === 'local_file' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                isFullscreen ? 'p-2.5 sm:p-3 rounded-xl' : 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl'
              } text-xs font-bold bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer shrink-0 min-h-[40px]`}
              title="Select Video File"
            >
              <CinemaReelIcon size={16} />
              {!isFullscreen && <span className="hidden sm:inline">Select Video File</span>}
            </button>
          )}

          {/* Settings Trigger */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                isFullscreen ? 'p-2.5 sm:p-3 rounded-xl' : 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl'
              } text-xs font-bold bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer shrink-0 min-h-[40px]`}
              title="Pipeline Settings & Diagnostics (S)"
            >
              <Settings size={16} />
              {!isFullscreen && <span className="hidden sm:inline">Settings</span>}
            </button>
          )}

          {/* Emoji Reactions Trigger */}
          {onSendEmojiReaction && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsEmojiTrayOpen((prev) => !prev)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                  isFullscreen ? 'p-2.5 sm:p-3 rounded-xl' : 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl'
                } text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                  isEmojiTrayOpen
                    ? 'bg-[var(--accent)] text-black border border-[var(--accent)]'
                    : 'bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08]'
                }`}
                title="Cinema Emoji Reactions (R)"
              >
                <Smile size={16} />
                {!isFullscreen && <span className="hidden sm:inline">React</span>}
              </button>

              <EmojiReactions
                isOpen={isEmojiTrayOpen}
                onClose={() => setIsEmojiTrayOpen(false)}
                onSendReaction={onSendEmojiReaction}
                activeReactions={activeReactions || []}
              />
            </div>
          )}

          {/* Host Controls Trigger (Only visible to host) */}
          {isHost && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsHostControlsOpen((prev) => !prev)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                  isFullscreen ? 'p-2.5 sm:p-3 rounded-xl' : 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl'
                } text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                  isHostControlsOpen
                    ? 'bg-[#C8A97E] text-black border border-[#C8A97E]'
                    : 'bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08]'
                }`}
                title="Room Host Controls (H)"
              >
                <ShieldAlert size={16} />
                {!isFullscreen && <span className="hidden sm:inline">Host Controls</span>}
              </button>
            </div>
          )}
        </div>

        {/* Right Dock Controls: Leave Room */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onLeaveRoom}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
              isFullscreen ? 'p-2.5 sm:p-3 rounded-xl' : 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl'
            } text-xs font-bold bg-[#FF453A]/10 hover:bg-[#FF453A]/20 text-[#FF453A] border border-[#FF453A]/20 transition cursor-pointer shrink-0 min-h-[40px]`}
            title="Leave Watchroom"
          >
            <LogOut size={16} />
            {!isFullscreen && <span className="hidden sm:inline">Leave</span>}
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
      {childrenSettings}
    </div>
  );
};
