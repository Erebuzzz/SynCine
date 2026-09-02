import React, { useState, useRef, useEffect } from 'react';
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
  Settings
} from 'lucide-react';

export type DisplayLayout = 'theater' | 'grid' | 'floating';

export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isSelf?: boolean;
  isMicActive?: boolean;
  isCameraActive?: boolean;
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
}

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
  onOpenSettings
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

  useEffect(() => {
    if (mainVideoRef.current && mediaStream) {
      mainVideoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  const toggleMutePeer = (peerId: string) => {
    setMutedPeers((prev) => ({ ...prev, [peerId]: !prev[peerId] }));
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mainStageContainerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

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

  const totalUsersInRoom = participants.length + 1;

  return (
    <div
      ref={mainStageContainerRef}
      className="relative w-screen h-screen bg-white dark:bg-black overflow-hidden flex flex-col font-sans select-none text-[#1D1D1F] dark:text-[#F5F5F7]"
    >
      {/* Top Floating Glass Navigation Header */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between z-40 shrink-0 relative gap-2">
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
            title="Copy watchroom link"
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
              title="Floating Viewports"
            >
              <FloatingLayoutIcon size={15} />
            </button>
          </div>

          {/* Chat Toggle */}
          <button
            onClick={toggleChat}
            className={`relative p-1.5 sm:p-2 rounded-xl border transition cursor-pointer ${
              isChatOpen
                ? 'bg-black/[0.08] dark:bg-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7] border-black/[0.08] dark:border-white/[0.1]'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border-black/[0.06] dark:border-white/[0.08] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
            }`}
            title="Toggle Watchroom Chat"
          >
            <MessageSquare size={15} />
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF453A] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Settings Toggle */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 rounded-xl border bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border-black/[0.06] dark:border-white/[0.08] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition cursor-pointer"
              title="Pipeline Settings & Live Diagnostics"
              aria-label="Settings"
            >
              <Settings size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Main Cinema Viewport */}
      <main className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Stage Area */}
        <div
          className={`transition-all duration-300 flex-1 relative bg-white dark:bg-black flex flex-col justify-center items-center w-full ${
            layout === 'theater' && participants.length > 0
              ? 'md:w-[calc(100%-19rem)] h-[calc(100%-8.5rem)] sm:h-[calc(100%-10.5rem)] md:h-full'
              : 'h-full'
          }`}
        >
          {localFileUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-white dark:bg-black">
              <video
                ref={(el) => {
                  mainVideoRef.current = el;
                  if (videoRefCallback) videoRefCallback(el);
                }}
                src={localFileUrl}
                controls
                playsInline
                className="w-full h-full object-contain max-h-full"
              />
            </div>
          ) : mediaStream ? (
            <div className="relative w-full h-full flex items-center justify-center bg-white dark:bg-black">
              <video
                ref={(el) => {
                  mainVideoRef.current = el;
                  if (el) {
                    el.srcObject = mediaStream;
                    el.volume = mainVideoMuted ? 0 : mainVideoVolume;
                  }
                  if (videoRefCallback) videoRefCallback(el);
                }}
                autoPlay
                playsInline
                className="w-full h-full object-contain max-h-full"
              />

              {/* Movie Audio Track Slider */}
              <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] px-3.5 py-2 rounded-2xl flex items-center gap-2.5 shadow-sm z-20">
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
              </div>
            </div>
          ) : (
            /* Atmospheric Standby Stage */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl flex items-center justify-center text-black/30 dark:text-white/30 mb-6">
                {mediaMode === 'screen' ? <ScreenCastIcon size={38} /> : <CinemaReelIcon size={38} />}
              </div>
              <h2 className="relative z-10 text-2xl sm:text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2 tracking-tight">
                {mediaMode === 'screen' ? 'Screen Stream Stage' : 'Local File Synchronization Stage'}
              </h2>
              <p className="relative z-10 text-black/55 dark:text-white/55 text-xs sm:text-sm max-w-md mb-8 leading-relaxed font-normal">
                {mediaMode === 'screen'
                  ? isHost
                    ? 'Click "Start Screen Cast" below to broadcast your video stream with hardware-accelerated H.264 transmission.'
                    : 'Awaiting host screen broadcast. Grab your popcorn.'
                  : 'Load the identical video file into your player. SynCine will maintain sub-frame playback synchronization with zero upload.'}
              </p>

              {mediaMode === 'local_file' && (
                <div className="relative z-10">
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
                    className="px-6 py-3.5 rounded-xl bg-[#8B7355] dark:bg-[#C8A97E] text-white dark:text-black font-bold text-xs transition flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <CinemaReelIcon size={18} />
                    <span>Choose Local Video File</span>
                  </button>
                </div>
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
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Theater View Lateral Sidebar on Desktop, Horizontal Strip on Mobile/Tablet */}
        {layout === 'theater' && participants.length > 0 && (
          <aside className="w-full md:w-76 h-36 sm:h-44 md:h-full bg-white/95 dark:bg-black/95 backdrop-blur-xl md:border-l md:border-t-0 border-t border-black/[0.06] dark:border-white/[0.06] p-2.5 sm:p-3 md:p-4 overflow-x-auto md:overflow-y-auto flex md:flex-col flex-row gap-2.5 sm:gap-3 md:gap-3.5 shrink-0 z-20">
            <div className="hidden md:flex items-center justify-between text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2 px-1">
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
                  className="relative w-40 sm:w-48 md:w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] shrink-0"
                >
                  {hasVideo ? (
                    <video
                      ref={(v) => {
                        if (v && p.stream) {
                          v.srcObject = p.stream;
                          if (!p.isSelf) {
                            v.volume = mutedPeers[p.id] ? 0 : volumes[p.id] ?? 0.8;
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={p.isSelf}
                      className={`w-full h-full object-cover ${p.isSelf ? 'scale-x-[-1]' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-xs sm:text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-black/45 dark:text-white/45 font-medium">Camera off</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl p-2 sm:p-2.5 flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] text-[11px] sm:text-xs font-bold truncate max-w-[80px] sm:max-w-[105px]" title={p.name}>
                        {p.name}
                      </span>
                      {p.isSelf && (
                        <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.1] text-black/60 dark:text-white/60 font-semibold shrink-0">
                          YOU
                        </span>
                      )}
                    </div>

                    {p.isSelf ? (
                      <div className="flex items-center gap-1">
                        {p.isMicActive ? (
                          <span className="p-0.5 sm:p-1 rounded-md bg-[#30D158]/15 text-[#30D158]">
                            <LiquidMicIcon size={12} />
                          </span>
                        ) : (
                          <span className="p-0.5 sm:p-1 rounded-md bg-[#FF453A]/15 text-[#FF453A]">
                            <LiquidMicOffIcon size={12} />
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleMutePeer(p.id)}
                          className="text-black/55 dark:text-white/55 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] p-1 rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition cursor-pointer"
                        >
                          {mutedPeers[p.id] ? (
                            <VolumeX size={13} className="text-[#FF453A]" />
                          ) : (
                            <Volume2 size={13} />
                          )}
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
                          className="hidden md:block w-14 h-1 accent-black/30 dark:accent-white/30 cursor-pointer"
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
                  className="pointer-events-auto aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black/[0.03] dark:bg-white/[0.04] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] relative"
                >
                  {hasVideo ? (
                    <video
                      ref={(v) => {
                        if (v && p.stream) {
                          v.srcObject = p.stream;
                          if (!p.isSelf) {
                            v.volume = mutedPeers[p.id] ? 0 : volumes[p.id] ?? 0.8;
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={p.isSelf}
                      className={`w-full h-full object-cover ${p.isSelf ? 'scale-x-[-1]' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/[0.02] dark:bg-white/[0.02] text-black/40 dark:text-white/40">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-xs sm:text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-black/45 dark:text-white/45 font-medium">Camera off</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[#1D1D1F] dark:text-[#F5F5F7] text-[11px] sm:text-xs font-bold truncate">
                      {p.name}
                    </span>
                    {!p.isSelf && (
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
                        className="hidden sm:block w-14 md:w-16 h-1 accent-black/30 dark:accent-white/30 cursor-pointer"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Draggable Viewports */}
        {layout === 'floating' &&
          participants.map((p, idx) => (
            <DraggableTile
              key={p.id}
              participant={{
                id: p.id,
                name: p.name,
                stream: p.stream,
                isMicActive: p.isMicActive,
                isSelf: p.isSelf
              }}
              initialX={24 + idx * 280}
              initialY={90}
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

      {/* Bottom Liquid Glass Control Dock */}
      <footer className="h-16 sm:h-18 px-3 sm:px-6 md:px-8 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between z-40 shrink-0 relative gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar py-1">
          {/* Studio Microphone Toggle */}
          <button
            onClick={onToggleMic}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
              isMicActive
                ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/20 hover:bg-[#30D158]/25'
                : 'bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/20 hover:bg-[#FF453A]/25'
            }`}
            title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicActive ? <LiquidMicIcon size={16} /> : <LiquidMicOffIcon size={16} />}
            <span className="hidden sm:inline">{isMicActive ? 'Mic Active' : 'Mic Muted'}</span>
          </button>

          {/* Studio Camera Toggle */}
          {onToggleCamera && (
            <button
              onClick={onToggleCamera}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                isCameraActive
                  ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/20 hover:bg-[#30D158]/25'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-black/55 dark:text-white/55 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
              }`}
              title={isCameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isCameraActive ? <Video size={16} /> : <VideoOff size={16} />}
              <span className="hidden sm:inline">{isCameraActive ? 'Camera On' : 'Camera Off'}</span>
            </button>
          )}

          {/* Screen Share Action (Host) */}
          {mediaMode === 'screen' && isHost && (
            <button
              onClick={onToggleScreenShare}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[40px] ${
                isSharingScreen
                  ? 'bg-[#8B7355]/15 dark:bg-[#C8A97E]/15 text-[#8B7355] dark:text-[#C8A97E] border border-[#8B7355]/20 dark:border-[#C8A97E]/20 hover:bg-[#8B7355]/25 dark:hover:bg-[#C8A97E]/25'
                  : 'bg-[#8B7355] dark:bg-[#C8A97E] text-white dark:text-black hover:opacity-90'
              }`}
            >
              <ScreenCastIcon size={16} />
              <span className="hidden sm:inline">
                {isSharingScreen ? 'Stop Screen Cast' : 'Start Screen Cast'}
              </span>
            </button>
          )}

          {/* Select Video File (Local File Mode) */}
          {mediaMode === 'local_file' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer shrink-0 min-h-[40px]"
            >
              <CinemaReelIcon size={16} />
              <span className="hidden sm:inline">Select Video File</span>
            </button>
          )}

          {/* Watchroom Settings */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold bg-black/[0.04] dark:bg-white/[0.06] text-black/65 dark:text-white/65 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition cursor-pointer shrink-0 min-h-[40px]"
              title="Pipeline Settings & Live Diagnostics"
            >
              <Settings size={16} />
              <span className="hidden md:inline">Settings</span>
            </button>
          )}
        </div>

        {/* Leave Watchroom */}
        <div className="shrink-0">
          <button
            onClick={onLeaveRoom}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold bg-[#FF453A]/15 hover:bg-[#FF453A]/25 text-[#FF453A] border border-[#FF453A]/20 transition cursor-pointer min-h-[40px]"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </footer>

      {childrenSettings}
    </div>
  );
};
