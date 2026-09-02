import React, { useState } from 'react';
import { SynLogo, ScreenCastIcon, CinemaReelIcon, MeshNetworkIcon, LatencySyncIcon } from './icons/SynIcons';
import { LiquidGlassCard } from './LiquidGlassCard';
import { Shield, Sparkles, ArrowRight } from 'lucide-react';

interface LobbyProps {
  currentUserId: string;
  userName: string;
  onUserNameChange: (name: string) => void;
  onCreateRoom: (name: string, mode: 'screen' | 'local_file') => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
  initialRoomId?: string;
  isAuthenticating: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  currentUserId,
  userName,
  onUserNameChange,
  onCreateRoom,
  onJoinRoom,
  initialRoomId = '',
  isAuthenticating
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomId ? 'join' : 'create');
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState(initialRoomId);
  const [mediaMode, setMediaMode] = useState<'screen' | 'local_file'>('screen');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !userName.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onCreateRoom(roomName.trim(), mediaMode);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize watchroom.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim() || !userName.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onJoinRoom(joinRoomId.trim());
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to join watchroom.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 md:p-12 font-sans select-none overflow-x-hidden overflow-y-auto z-10">
      {/* Top Glass Navigation */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-3 px-5 sm:px-8 rounded-full bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-2xl shrink-0">
        <div className="flex items-center gap-3">
          <SynLogo size={36} className="shrink-0 drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
          <div className="flex flex-col">
            <span className="text-white font-black text-lg tracking-tight leading-none flex items-center gap-1.5">
              <span>SynCine</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Mesh v1.0
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide">
              From Greek &quot;Syn&quot; (Together)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/10 text-xs text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                currentUserId
                  ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-medium hidden sm:inline">
              {isAuthenticating ? 'Connecting Session...' : 'Anonymous Guest'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Center Section */}
      <main className="w-full max-w-4xl mx-auto my-auto py-8 sm:py-12 flex flex-col items-center">
        {/* Value Proposition Header */}
        <div className="text-center max-w-2xl mb-8 sm:mb-10 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 via-pink-500/15 to-cyan-500/15 border border-white/15 text-indigo-200 text-xs font-semibold mb-5 shadow-lg backdrop-blur-xl">
            <Sparkles size={14} className="text-pink-400" />
            <span>Zero-Cost P2P Mesh &middot; No Cloud Transcoding Required</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-tight leading-[1.1] mb-4">
            Cinema Experience, United in Real Time.
          </h1>
          <p className="text-slate-300/80 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-normal">
            Stream high-definition video directly across browsers with hardware-accelerated H.264 mesh and sub-millisecond drift synchronization.
          </p>
        </div>

        {/* Liquid Glass Card Container */}
        <LiquidGlassCard variant="surface" className="w-full max-w-lg p-6 sm:p-8">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-black/50 rounded-2xl border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setErrorMessage(null);
              }}
              className={`py-3 text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Create Watchroom</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setErrorMessage(null);
              }}
              className={`py-3 text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'join'
                  ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Join Watchroom</span>
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between backdrop-blur-md">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 font-bold ml-2 hover:text-rose-200"
              >
                ✕
              </button>
            </div>
          )}

          {/* User Name Input */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-300 mb-2 tracking-wide uppercase">
              Your Alias
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder="e.g. Cinephile"
              maxLength={32}
              className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3.5 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
            />
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 tracking-wide uppercase">
                  Watchroom Title
                </label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Interstellar Premiere"
                  maxLength={64}
                  className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3.5 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
                />
              </div>

              {/* Playback Pipeline Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 tracking-wide uppercase">
                  Playback Transmission Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setMediaMode('screen')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col ${
                      mediaMode === 'screen'
                        ? 'bg-indigo-600/25 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className={`p-2 rounded-xl ${
                          mediaMode === 'screen'
                            ? 'bg-indigo-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <ScreenCastIcon size={18} />
                      </div>
                      <span className="text-xs font-bold text-slate-100">Screen Cast</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-snug">
                      Direct P2P browser tab or display stream with H.264 encoding.
                    </span>
                  </div>

                  <div
                    onClick={() => setMediaMode('local_file')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col ${
                      mediaMode === 'local_file'
                        ? 'bg-indigo-600/25 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className={`p-2 rounded-xl ${
                          mediaMode === 'local_file'
                            ? 'bg-indigo-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <CinemaReelIcon size={18} />
                      </div>
                      <span className="text-xs font-bold text-slate-100">Local File Sync</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-snug">
                      Synchronize local file playback with zero server upload.
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isAuthenticating || !roomName.trim() || !userName.trim()}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Creating Watchroom...' : 'Launch Watchroom'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 tracking-wide uppercase">
                  Watchroom Identifier
                </label>
                <input
                  type="text"
                  required
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Paste Room ID here"
                  maxLength={36}
                  className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3.5 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isAuthenticating || !joinRoomId.trim() || !userName.trim()}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Connecting to Room...' : 'Enter Watchroom'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Architecture Trust Badges */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-2 text-[11px] text-slate-400 text-center">
            <div className="flex flex-col items-center gap-1">
              <MeshNetworkIcon size={16} className="text-indigo-400" />
              <span>4-Peer Mesh</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <LatencySyncIcon size={16} className="text-cyan-400" />
              <span>&lt;350ms Jitter</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Shield size={16} className="text-emerald-400" />
              <span>DLS Secured</span>
            </div>
          </div>
        </LiquidGlassCard>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-4 text-center text-xs text-slate-500 font-medium">
        <span>SynCine &copy; 2026 &middot; Direct WebRTC Media Transport &middot; Appwrite Cloud Signaling</span>
      </footer>
    </div>
  );
};
