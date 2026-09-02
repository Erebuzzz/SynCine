import React, { useState, useRef, useEffect } from 'react';
import { DraggableTile } from './DraggableTile';
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
  Sliders
} from 'lucide-react';

export type DisplayLayout = 'theater' | 'grid' | 'floating';

export interface Participant {
  id: string;
  name: string;
  stream: MediaStream;
  isSelf?: boolean;
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
  isSharingScreen: boolean;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  onSelectLocalFile: (file: File) => void;
  onLeaveRoom: () => void;
  videoRefCallback?: (el: HTMLVideoElement | null) => void;
  childrenChat?: React.ReactNode;
  unreadChatCount?: number;
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
  isSharingScreen,
  onToggleMic,
  onToggleScreenShare,
  onSelectLocalFile,
  onLeaveRoom,
  videoRefCallback,
  childrenChat,
  unreadChatCount = 0
}) => {
  const [layout, setLayout] = useState<DisplayLayout>('theater');
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [mutedPeers, setMutedPeers] = useState<Record<string, boolean>>({});
  const [mainVideoMuted, setMainVideoMuted] = useState(false);
  const [mainVideoVolume, setMainVideoVolume] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      className="relative w-screen h-screen bg-[#030611] overflow-hidden flex flex-col font-sans select-none text-slate-100"
    >
      {/* Top Floating Glass Navigation Header */}
      <header className="h-16 px-4 sm:px-6 bg-[rgba(8,12,26,0.85)] backdrop-blur-2xl border-b border-white/[0.12] flex items-center justify-between z-40 shrink-0 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Room Info */}
        <div className="flex items-center gap-3 min-w-0">
          <SynLogo size={28} className="shrink-0 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          <div className="h-4 w-px bg-white/15 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white text-sm font-bold truncate max-w-[130px] sm:max-w-[200px]" title={roomName}>
              {roomName}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              {isHost ? 'Host' : 'Viewer'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/40 text-slate-300 border border-white/10 flex items-center gap-1.5 shrink-0">
              <MeshNetworkIcon size={12} className="text-cyan-400" />
              <span>{totalUsersInRoom}/4</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={handleCopyInviteLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 transition cursor-pointer"
            title="Copy watchroom link"
          >
            {copiedLink ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Layout Mode Switcher */}
          <div className="flex gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setLayout('theater')}
              className={`p-1.5 rounded-lg transition duration-150 cursor-pointer ${
                layout === 'theater'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Theater View"
            >
              <TheaterLayoutIcon size={16} />
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={`p-1.5 rounded-lg transition duration-150 cursor-pointer ${
                layout === 'grid'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <GridLayoutIcon size={16} />
            </button>
            <button
              onClick={() => setLayout('floating')}
              className={`p-1.5 rounded-lg transition duration-150 cursor-pointer ${
                layout === 'floating'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Floating Viewports"
            >
              <FloatingLayoutIcon size={16} />
            </button>
          </div>

          {/* Chat Toggle */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`relative p-2 rounded-xl border transition cursor-pointer ${
              isChatOpen
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                : 'bg-white/[0.06] text-slate-300 border-white/10 hover:text-white hover:bg-white/[0.12]'
            }`}
            title="Toggle Watchroom Chat"
          >
            <MessageSquare size={16} />
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-md">
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Cinema Viewport */}
      <main className="flex-1 relative flex overflow-hidden">
        {/* Stage Area */}
        <div
          className={`transition-all duration-300 flex-1 h-full relative bg-black flex flex-col justify-center items-center ${
            layout === 'theater' && participants.length > 0 ? 'w-[calc(100%-19rem)]' : 'w-full'
          }`}
        >
          {localFileUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
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
            <div className="relative w-full h-full flex items-center justify-center bg-black">
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
              <div className="absolute top-4 right-4 bg-[rgba(10,16,34,0.75)] backdrop-blur-2xl border border-white/15 px-3.5 py-2 rounded-2xl flex items-center gap-2.5 shadow-2xl z-20">
                <button
                  type="button"
                  onClick={() => setMainVideoMuted(!mainVideoMuted)}
                  className="text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {mainVideoMuted || mainVideoVolume === 0 ? (
                    <VolumeX size={15} className="text-rose-400" />
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
                  className="w-20 h-1 accent-indigo-400 cursor-pointer"
                  title="Media Stream Volume"
                />
              </div>
            </div>
          ) : (
            /* Atmospheric Standby Stage */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              <div className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-900/50 to-pink-900/40 border border-white/15 backdrop-blur-2xl flex items-center justify-center text-indigo-300 mb-6 shadow-2xl">
                {mediaMode === 'screen' ? <ScreenCastIcon size={38} /> : <CinemaReelIcon size={38} />}
              </div>
              <h2 className="relative z-10 text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
                {mediaMode === 'screen' ? 'Screen Stream Stage' : 'Local File Synchronization Stage'}
              </h2>
              <p className="relative z-10 text-slate-300/80 text-xs sm:text-sm max-w-md mb-8 leading-relaxed font-normal">
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
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition flex items-center gap-2 mx-auto cursor-pointer"
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
              className="p-2.5 bg-[rgba(10,16,34,0.75)] hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl border border-white/10 backdrop-blur-2xl transition shadow-xl cursor-pointer"
              title="Picture in Picture"
            >
              <PictureInPicture2 size={16} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 bg-[rgba(10,16,34,0.75)] hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl border border-white/10 backdrop-blur-2xl transition shadow-xl cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Theater View Lateral Sidebar */}
        {layout === 'theater' && participants.length > 0 && (
          <aside className="w-76 h-full bg-[rgba(8,12,26,0.85)] backdrop-blur-2xl border-l border-white/[0.12] p-4 overflow-y-auto space-y-3.5 shrink-0 z-20">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2 px-1">
              <span className="flex items-center gap-2 uppercase tracking-wide text-[11px] text-slate-400">
                <Sliders size={13} className="text-pink-400" />
                <span>Live Audio Mixer</span>
              </span>
            </div>

            {participants.map((p) => (
              <div
                key={p.id}
                className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900/90 border border-white/10 shadow-xl"
              >
                <video
                  ref={(v) => {
                    if (v) {
                      v.srcObject = p.stream;
                      v.volume = mutedPeers[p.id] ? 0 : volumes[p.id] ?? 0.8;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2.5 flex items-center justify-between">
                  <span className="text-white text-xs font-semibold truncate max-w-[95px]" title={p.name}>
                    {p.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleMutePeer(p.id)}
                      className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                    >
                      {mutedPeers[p.id] ? (
                        <VolumeX size={13} className="text-rose-400" />
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
                      className="w-14 h-1 accent-indigo-400 cursor-pointer"
                      title="Peer Volume"
                    />
                  </div>
                </div>
              </div>
            ))}
          </aside>
        )}

        {/* Grid View Layout */}
        {layout === 'grid' && participants.length > 0 && (
          <div className="absolute inset-x-6 bottom-24 grid grid-cols-2 md:grid-cols-4 gap-4 z-30 pointer-events-none">
            {participants.map((p) => (
              <div
                key={p.id}
                className="pointer-events-auto aspect-video rounded-2xl overflow-hidden bg-[rgba(10,16,34,0.75)] backdrop-blur-2xl border border-white/15 shadow-2xl relative"
              >
                <video
                  ref={(v) => {
                    if (v) {
                      v.srcObject = p.stream;
                      v.volume = mutedPeers[p.id] ? 0 : volumes[p.id] ?? 0.8;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 py-2 flex items-center justify-between">
                  <span className="text-white text-xs font-semibold truncate">{p.name}</span>
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
                    className="w-16 h-1 accent-indigo-400 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Draggable Viewports */}
        {layout === 'floating' &&
          participants.map((p) => (
            <DraggableTile
              key={p.id}
              id={p.id}
              name={p.name}
              stream={p.stream}
              volume={volumes[p.id] ?? 0.8}
              isMuted={mutedPeers[p.id]}
              onVolumeChange={(val) => setVolumes((prev) => ({ ...prev, [p.id]: val }))}
              onToggleMute={() => toggleMutePeer(p.id)}
            />
          ))}

        {/* Room Chat Drawer */}
        {childrenChat && isChatOpen && (
          <div className="h-full shrink-0 z-30">{childrenChat}</div>
        )}
      </main>

      {/* Bottom Liquid Glass Control Dock */}
      <footer className="h-18 px-5 sm:px-8 bg-[rgba(8,12,26,0.85)] backdrop-blur-2xl border-t border-white/[0.12] flex items-center justify-between z-40 shrink-0 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <div className="flex items-center gap-2.5">
          {/* Studio Microphone Toggle */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-lg cursor-pointer ${
              isMicActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
            }`}
            title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicActive ? <LiquidMicIcon size={16} /> : <LiquidMicOffIcon size={16} />}
            <span className="hidden sm:inline">{isMicActive ? 'Mic Active' : 'Mic Muted'}</span>
          </button>

          {/* Screen Share Action (Host) */}
          {mediaMode === 'screen' && isHost && (
            <button
              onClick={onToggleScreenShare}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-lg cursor-pointer ${
                isSharingScreen
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-indigo-600/30'
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 transition shadow-sm cursor-pointer"
            >
              <CinemaReelIcon size={16} />
              <span className="hidden sm:inline">Select Video File</span>
            </button>
          )}
        </div>

        {/* Leave Watchroom */}
        <div>
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 transition shadow-md cursor-pointer"
          >
            <LogOut size={16} />
            <span>Leave Watchroom</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
