import React, { useState, useRef, useEffect } from 'react';
import { DraggableTile } from './DraggableTile';
import {
  Sidebar,
  LayoutGrid,
  Move,
  Mic,
  MicOff,
  Share2,
  Tv,
  Film,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  MessageSquare,
  LogOut,
  Check,
  Users,
  Volume2,
  VolumeX,
  Clapperboard,
  Sparkles
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

  // Bind video element to ref and external synchronizer
  useEffect(() => {
    if (mainVideoRef.current && videoRefCallback) {
      videoRefCallback(mainVideoRef.current);
    }
  }, [videoRefCallback, localFileUrl, mediaStream]);

  // Handle media stream attach
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
      className="relative w-screen h-screen bg-[#050811] overflow-hidden flex flex-col font-sans select-none text-slate-100"
    >
      {/* Top Liquid Glass Header Bar */}
      <header className="h-16 px-5 liquid-glass-dock flex items-center justify-between z-40 shrink-0 relative">
        {/* Specular Rim Light */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30 border border-white/20">
              <Clapperboard size={18} className="text-white" />
            </div>
            <span className="text-white font-extrabold text-base tracking-tight hidden sm:inline">SynCine</span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-200 text-sm font-semibold truncate max-w-[140px] sm:max-w-[220px]" title={roomName}>
              {roomName}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              {isHost ? 'Host' : 'Viewer'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/40 text-slate-400 border border-white/10 flex items-center gap-1 shrink-0">
              <Users size={11} className="text-indigo-400" />
              <span>{totalUsersInRoom}/4</span>
            </span>
          </div>
        </div>

        {/* Layout & Control Switchers */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyInviteLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition shadow-sm"
            title="Copy room invite link"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Layout buttons */}
          <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setLayout('theater')}
              className={`p-1.5 rounded-lg transition duration-150 ${
                layout === 'theater'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Theater View"
            >
              <Sidebar size={15} />
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={`p-1.5 rounded-lg transition duration-150 ${
                layout === 'grid'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setLayout('floating')}
              className={`p-1.5 rounded-lg transition duration-150 ${
                layout === 'floating'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Floating Viewports"
            >
              <Move size={15} />
            </button>
          </div>

          {/* Chat Toggle */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`relative p-2 rounded-xl border transition ${
              isChatOpen
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-600/25'
                : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Room Chat"
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

      {/* Main View Area */}
      <main className="flex-1 relative flex overflow-hidden">
        {/* Main Stage Video Container */}
        <div
          className={`transition-all duration-300 flex-1 h-full relative bg-black flex flex-col justify-center items-center ${
            layout === 'theater' ? 'w-[calc(100%-19rem)]' : 'w-full'
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

              {/* Movie Audio Volume Overlay */}
              <div className="absolute top-4 right-4 liquid-glass-dock px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-2xl z-20">
                <button
                  type="button"
                  onClick={() => setMainVideoMuted(!mainVideoMuted)}
                  className="text-slate-300 hover:text-white transition"
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
                  className="w-20 h-1 accent-indigo-500 cursor-pointer"
                  title="Stream Volume"
                />
              </div>
            </div>
          ) : (
            /* Atmospheric Ambient Standby Stage */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              <div className="absolute w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none animate-liquid-orb-1" />
              <div className="absolute w-80 h-80 rounded-full bg-pink-600/10 blur-3xl pointer-events-none animate-liquid-orb-2" />

              <div className="relative z-10 w-20 h-20 rounded-3xl liquid-glass-card flex items-center justify-center text-indigo-400 mb-5 shadow-2xl">
                {mediaMode === 'screen' ? <Tv size={36} /> : <Film size={36} />}
              </div>
              <h2 className="relative z-10 text-xl font-extrabold text-white mb-2 tracking-tight">
                {mediaMode === 'screen' ? 'Screen Stream Stage' : 'Local File Synchronization Stage'}
              </h2>
              <p className="relative z-10 text-slate-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
                {mediaMode === 'screen'
                  ? isHost
                    ? 'You are the host. Click "Start Screen Share" on the bottom dock to begin streaming a tab, window, or desktop to all participants.'
                    : 'Waiting for the host to start sharing their screen or movie stream.'
                  : 'Load identical local video files (.mp4, .mkv, .webm) into the player. SynCine will synchronize playback without uploading files to any server.'}
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
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition flex items-center gap-2 mx-auto"
                  >
                    <Film size={16} />
                    <span>Choose Local Video File</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Picture in Picture & Fullscreen Floating Buttons */}
          <div className="absolute bottom-5 right-5 flex items-center gap-2 z-20">
            <button
              onClick={togglePictureInPicture}
              className="p-2.5 liquid-glass-dock hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl transition shadow-xl"
              title="Picture in Picture"
            >
              <PictureInPicture2 size={16} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 liquid-glass-dock hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl transition shadow-xl"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Theater View Sidebar */}
        {layout === 'theater' && (
          <aside className="w-76 h-full liquid-glass-dock p-4 overflow-y-auto space-y-3.5 shrink-0 z-20 border-l border-white/10">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2 px-1">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-pink-400" />
                <span>Participants ({participants.length})</span>
              </span>
            </div>

            {participants.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs px-2">
                No other participants yet. Share the invite link to watch together.
              </div>
            ) : (
              participants.map((p) => (
                <div
                  key={p.id}
                  className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900/90 border border-white/10 shadow-xl group"
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
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleMutePeer(p.id)}
                        className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                      >
                        {mutedPeers[p.id] ? (
                          <VolumeX size={12} className="text-rose-400" />
                        ) : (
                          <Volume2 size={12} />
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
                        title="Participant Audio"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </aside>
        )}

        {/* Grid View Layout */}
        {layout === 'grid' && participants.length > 0 && (
          <div className="absolute inset-x-6 bottom-24 grid grid-cols-2 md:grid-cols-4 gap-4 z-30 pointer-events-none">
            {participants.map((p) => (
              <div
                key={p.id}
                className="pointer-events-auto aspect-video rounded-2xl overflow-hidden liquid-glass-card shadow-2xl relative"
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

        {/* Floating Overlays */}
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

        {/* Chat Drawer */}
        {childrenChat && isChatOpen && (
          <div className="h-full shrink-0 z-30">{childrenChat}</div>
        )}
      </main>

      {/* Bottom Floating Liquid Glass Control Dock */}
      <footer className="h-18 px-6 liquid-glass-dock flex items-center justify-between z-40 shrink-0 relative">
        {/* Specular Rim Light */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="flex items-center gap-2.5">
          {/* Microphone Toggle */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-lg ${
              isMicActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
            }`}
            title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicActive ? <Mic size={16} /> : <MicOff size={16} />}
            <span className="hidden sm:inline">{isMicActive ? 'Mic On' : 'Mic Muted'}</span>
          </button>

          {/* Screen Share Toggle (Host Only in Screen Mode) */}
          {mediaMode === 'screen' && isHost && (
            <button
              onClick={onToggleScreenShare}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-lg ${
                isSharingScreen
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30'
              }`}
            >
              <Tv size={16} />
              <span className="hidden sm:inline">
                {isSharingScreen ? 'Stop Sharing' : 'Start Screen Share'}
              </span>
            </button>
          )}

          {/* Local File Change (Local File Mode) */}
          {mediaMode === 'local_file' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition shadow-sm"
            >
              <Film size={16} />
              <span className="hidden sm:inline">Select Video</span>
            </button>
          )}
        </div>

        {/* Leave Room Button */}
        <div>
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 transition shadow-md"
          >
            <LogOut size={16} />
            <span>Leave Party</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
