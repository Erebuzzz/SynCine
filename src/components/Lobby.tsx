import React, { useState } from 'react';
import {
  SynLogo,
  ScreenCastIcon,
  CinemaReelIcon,
  MeshNetworkIcon,
  LatencySyncIcon
} from './icons/SynIcons';
import {
  Shield,
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
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full flex items-center justify-between py-3 px-5 sm:px-8 bg-white/90 dark:bg-black/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <SynLogo size={34} className="shrink-0" />
          <div className="flex flex-col">
            <span className="text-[var(--text-primary)] font-bold text-lg tracking-tight leading-none flex items-center gap-1.5">
              <span>SynCine</span>
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">
              From Greek "Syn" (Together)
            </span>
          </div>
        </div>

        {/* Auth / Guest Status Indicator */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[var(--text-secondary)]">
                <span className="w-2 h-2 rounded-full bg-white/50 dark:bg-white/50" />
                <span className="font-semibold hidden sm:inline">{currentUser?.name || currentUser?.email}</span>
                <span className="text-[10px] uppercase font-bold bg-black/[0.08] dark:bg-white/[0.1] px-1.5 py-0.5 rounded text-[var(--text-primary)]">Host</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
                title="Sign out to Guest"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[var(--text-secondary)]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentUser ? 'bg-white/50' : 'bg-white/30'
                  }`}
                />
                <span className="font-medium hidden sm:inline">
                  {isAuthenticating ? 'Connecting...' : 'Guest Session (3h Buffer)'}
                </span>
              </div>
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-secondary)] text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer"
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
        {/* Hero */}
        <section className="text-center max-w-3xl mb-12 sm:mb-16 mt-8">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-[var(--text-primary)] tracking-tight leading-[1.08] mb-6">
            Shared Cinema, Perfectly Synchronized.
          </h1>
          <p className="text-[var(--text-secondary)] text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
            Watch movies with friends with zero latency. Direct browser-to-browser WebRTC transmission with sub-350ms seek synchronization and strict 4-peer capacity.
          </p>
        </section>

        {/* Action Panel Container */}
        <div className="w-full max-w-xl mb-16 p-6 sm:p-8 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl">
          {/* Tab Header */}
          <div className="grid grid-cols-2 p-1.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl border border-black/[0.08] dark:border-white/[0.08] mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setErrorMessage(null);
              }}
              className={`py-3 text-xs font-bold rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-white/[0.1] text-[var(--text-primary)] shadow-sm dark:shadow-none'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
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
              className={`py-3 text-xs font-bold rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-white dark:bg-white/[0.1] text-[var(--text-primary)] shadow-sm dark:shadow-none'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span>Join with Code</span>
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-4 rounded-xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-[var(--destructive)] text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="font-bold ml-2 opacity-80 hover:opacity-100"
              >
                X
              </button>
            </div>
          )}

          {/* Display Name */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
              Your Display Name
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={32}
              className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm rounded-xl px-4 py-3.5 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
            />
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                  Watchroom Title
                </label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Dune Part Two Night"
                  maxLength={64}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm rounded-xl px-4 py-3.5 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
                />
              </div>

              {/* Media Transmission Mode */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                  Streaming Pipeline
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setMediaMode('screen')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col ${
                      mediaMode === 'screen'
                        ? 'bg-black/[0.06] dark:bg-white/[0.08] border-black/[0.12] dark:border-white/[0.15]'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className={`p-2 rounded-lg ${
                          mediaMode === 'screen'
                            ? 'bg-[var(--accent)] text-black dark:text-black'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)]'
                        }`}
                      >
                        <ScreenCastIcon size={18} />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">Screen Cast</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] leading-snug">
                      Hardware-accelerated H.264 tab or desktop broadcast.
                    </span>
                  </div>

                  <div
                    onClick={() => setMediaMode('local_file')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col ${
                      mediaMode === 'local_file'
                        ? 'bg-black/[0.06] dark:bg-white/[0.08] border-black/[0.12] dark:border-white/[0.15]'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className={`p-2 rounded-lg ${
                          mediaMode === 'local_file'
                            ? 'bg-[var(--accent)] text-black dark:text-black'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)]'
                        }`}
                      >
                        <CinemaReelIcon size={18} />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">Local File Sync</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] leading-snug">
                      Local video file sync with zero server upload.
                    </span>
                  </div>
                </div>
              </div>

              {/* Permanent Room Option (For Authenticated Hosts) */}
              <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <KeyRound size={16} className={isPermanent ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'} />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Permanent Watchroom
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
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
                  className="w-4 h-4 rounded border-black/[0.08] dark:border-white/[0.08] text-[var(--accent)] focus:ring-[var(--accent)]/20 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isAuthenticating || !roomName.trim() || !userName.trim()}
                className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black dark:text-black font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Creating Watchroom...' : 'Start Watchroom'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                  Room Code or URL
                </label>
                <input
                  type="text"
                  required
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="e.g. 6a97c0ed or paste link"
                  maxLength={100}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm rounded-xl px-4 py-3.5 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isAuthenticating || !joinRoomId.trim() || !userName.trim()}
                className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black dark:text-black font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Connecting...' : 'Join Watchroom'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Capacity & Security Badges */}
          <div className="mt-6 pt-5 border-t border-black/[0.08] dark:border-white/[0.08] grid grid-cols-3 gap-2 text-[11px] text-[var(--text-secondary)] text-center">
            <div className="flex flex-col items-center gap-1">
              <MeshNetworkIcon size={16} />
              <span>Max 4 Peers</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Clock size={16} />
              <span>3h Auto Reset</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Shield size={16} />
              <span>Zero Cloud Video</span>
            </div>
          </div>
        </div>

        {/* Feature Showcase Grid */}
        <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 sm:p-8 space-y-3 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[var(--text-secondary)]">
              <MeshNetworkIcon size={24} />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
              P2P WebRTC Mesh
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">
              Media flows directly peer-to-peer over encrypted SRTP streams. No centralized video proxy or server transcoding bill.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-3 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[var(--text-secondary)]">
              <LatencySyncIcon size={24} />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
              Drift-Compensated Sync
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">
              Continuous round-trip latency benchmarking and a 350ms seek jitter threshold guarantee seamless synchronized cinema playback.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-3 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[var(--text-secondary)]">
              <Clock size={24} />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
              3-Hour Ephemeral Buffer
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">
              Guest links automatically reset 3 hours after creation to respect database quotas and ensure zero user data residue.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full mx-auto py-6 px-4 border-t border-black/[0.06] dark:border-white/[0.06] text-center text-xs text-[var(--text-tertiary)] font-medium">
        <span>SynCine (c) 2026 / Real-Time P2P Synchronized Cinema / Powered by Appwrite Cloud</span>
      </footer>
    </div>
  );
};
