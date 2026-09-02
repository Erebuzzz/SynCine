import React, { useState } from 'react';
import {
  SynLogo,
  ScreenCastIcon,
  CinemaReelIcon,
  MeshNetworkIcon,
  LatencySyncIcon
} from './icons/SynIcons';
import { LiquidGlassCard } from './LiquidGlassCard';
import {
  Shield,
  Sparkles,
  ArrowRight,
  Clock,
  KeyRound,
  LogIn,
  LogOut
} from 'lucide-react';
import type { Models } from 'appwrite';

interface LobbyProps {
  currentUser: Models.User<Models.Preferences> | null;
  userName: string;
  onUserNameChange: (name: string) => void;
  onCreateRoom: (name: string, mode: 'screen' | 'local_file', isPermanent: boolean) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
  onOpenAuth: () => void;
  onLogout: () => Promise<void>;
  initialRoomId?: string;
  isAuthenticating: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  currentUser,
  userName,
  onUserNameChange,
  onCreateRoom,
  onJoinRoom,
  onOpenAuth,
  onLogout,
  initialRoomId = '',
  isAuthenticating
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomId ? 'join' : 'create');
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState(initialRoomId);
  const [mediaMode, setMediaMode] = useState<'screen' | 'local_file'>('screen');
  const [isPermanent, setIsPermanent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAuthenticated = Boolean(currentUser?.email && currentUser.email.length > 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !userName.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onCreateRoom(roomName.trim(), mediaMode, isPermanent);
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
    <div className="relative min-h-screen w-full flex flex-col justify-between font-sans select-none z-10">
      {/* Top Glass Navigation */}
      <header className="sticky top-4 z-40 w-[calc(100%-2rem)] max-w-6xl mx-auto flex items-center justify-between py-3 px-5 sm:px-8 rounded-full bg-[rgba(8,12,26,0.85)] backdrop-blur-2xl border border-white/[0.12] shadow-2xl shrink-0 mt-4">
        <div className="flex items-center gap-3">
          <SynLogo size={34} className="shrink-0 drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
          <div className="flex flex-col">
            <span className="text-white font-black text-lg tracking-tight leading-none flex items-center gap-1.5">
              <span>SynCine</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                P2P Mesh
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              From Greek &quot;Syn&quot; (Together)
            </span>
          </div>
        </div>

        {/* Auth / Guest Status Indicator */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-200">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="font-semibold hidden sm:inline">{currentUser?.name || currentUser?.email}</span>
                <span className="text-[10px] uppercase font-bold bg-indigo-600 px-1.5 py-0.5 rounded text-white">Host</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Sign out to Guest"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-xs text-slate-300">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentUser ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]' : 'bg-amber-400'
                  }`}
                />
                <span className="font-medium hidden sm:inline">
                  {isAuthenticating ? 'Connecting...' : 'Guest Session (3h Buffer)'}
                </span>
              </div>
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 text-xs font-semibold border border-white/10 transition cursor-pointer"
              >
                <LogIn size={13} />
                <span>Host Sign In</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area (Smoothly Scrollable) */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center flex-1">
        {/* Google Meet Inspired Hero */}
        <section className="text-center max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 via-pink-500/15 to-cyan-500/15 border border-white/15 text-indigo-200 text-xs font-semibold mb-6 shadow-xl backdrop-blur-2xl">
            <Sparkles size={14} className="text-pink-400" />
            <span>Zero Server Media Storage &middot; Google Meet-Grade WebRTC Mesh</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-tight leading-[1.08] mb-6">
            Shared Cinema, Perfectly Synchronized.
          </h1>
          <p className="text-slate-300/80 text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
            Watch movies with friends with zero latency. Direct browser-to-browser WebRTC transmission with sub-350ms seek synchronization and strict 4-peer capacity.
          </p>
        </section>

        {/* Action Panel Container */}
        <div className="w-full max-w-xl mb-16">
          <LiquidGlassCard variant="surface" className="p-6 sm:p-8">
            {/* Tab Header */}
            <div className="grid grid-cols-2 p-1.5 bg-black/50 rounded-2xl border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('create');
                  setErrorMessage(null);
                }}
                className={`py-3 text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>New Watchroom</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('join');
                  setErrorMessage(null);
                }}
                className={`py-3 text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Join with Code</span>
              </button>
            </div>

            {errorMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between backdrop-blur-md">
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

            {/* Display Name */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                Your Display Name
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => onUserNameChange(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={32}
                className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3.5 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
              />
            </div>

            {activeTab === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Watchroom Title
                  </label>
                  <input
                    type="text"
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g. Dune Part Two Night"
                    maxLength={64}
                    className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3.5 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
                  />
                </div>

                {/* Media Transmission Mode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Streaming Pipeline
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
                        Hardware-accelerated H.264 tab or desktop broadcast.
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
                        Local video file sync with zero server upload.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Permanent Room Option (For Authenticated Hosts) */}
                <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <KeyRound size={16} className={isPermanent ? 'text-indigo-400' : 'text-slate-500'} />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">
                        Permanent Watchroom
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {isAuthenticated
                          ? 'Link never expires (Host account active)'
                          : 'Requires optional Host Sign In (otherwise 3h buffer)'}
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isPermanent}
                    onChange={(e) => {
                      if (!isAuthenticated && e.target.checked) {
                        onOpenAuth();
                      } else {
                        setIsPermanent(e.target.checked);
                      }
                    }}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isAuthenticating || !roomName.trim() || !userName.trim()}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isLoading ? 'Creating Watchroom...' : 'Start Watchroom'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Room Code or URL
                  </label>
                  <input
                    type="text"
                    required
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="e.g. 6a97c0ed or paste link"
                    maxLength={100}
                    className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3.5 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isAuthenticating || !joinRoomId.trim() || !userName.trim()}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isLoading ? 'Connecting...' : 'Join Watchroom'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* Capacity & Security Badges */}
            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-2 text-[11px] text-slate-400 text-center">
              <div className="flex flex-col items-center gap-1">
                <MeshNetworkIcon size={16} className="text-indigo-400" />
                <span>Max 4 Peers</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Clock size={16} className="text-cyan-400" />
                <span>3h Auto Reset</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Shield size={16} className="text-emerald-400" />
                <span>Zero Cloud Video</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Editorial Feature Showcase Grid (Inspired by The Nocturne & Lucerra) */}
        <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <LiquidGlassCard variant="surface" className="p-6 sm:p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <MeshNetworkIcon size={24} />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">
              P2P WebRTC Mesh
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Media flows directly peer-to-peer over encrypted SRTP streams. No centralized video proxy or server transcoding bill.
            </p>
          </LiquidGlassCard>

          <LiquidGlassCard variant="surface" className="p-6 sm:p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300">
              <LatencySyncIcon size={24} />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Drift-Compensated Sync
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Continuous round-trip latency benchmarking and a 350ms seek jitter threshold guarantee seamless synchronized cinema playback.
            </p>
          </LiquidGlassCard>

          <LiquidGlassCard variant="surface" className="p-6 sm:p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Clock size={24} />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">
              3-Hour Ephemeral Buffer
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Guest links automatically reset 3 hours after creation to respect database quotas and ensure zero user data residue.
            </p>
          </LiquidGlassCard>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-6 px-4 border-t border-white/10 text-center text-xs text-slate-500 font-medium">
        <span>SynCine &copy; 2026 &middot; Real-Time P2P Synchronized Cinema &middot; Powered by Appwrite Cloud</span>
      </footer>
    </div>
  );
};
