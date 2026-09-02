import React, { useState, useRef } from 'react';
import {
  SynLogo,
  ScreenCastIcon,
  CinemaReelIcon
} from './icons/SynIcons';
import {
  ArrowRight,
  KeyRound,
  LogIn,
  LogOut,
  Sun,
  Moon,
  BookOpen,
  Shield,
  FileText
} from 'lucide-react';
import type { Models } from 'appwrite';

interface LobbyProps {
  currentUser: Models.User<Models.Preferences> | null;
  userName: string;
  onUserNameChange: (name: string) => void;
  onCreateRoom: (name: string, mode: 'screen' | 'local_file', isPermanent: boolean) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
  onOpenAuth: () => void;
  onOpenDocs: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onLogout: () => Promise<void>;
  isDark: boolean;
  onToggleTheme: () => void;
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
  onOpenDocs,
  onOpenPrivacy,
  onOpenTerms,
  onLogout,
  isDark,
  onToggleTheme,
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

  // Card mouse-tracking interactive sheen
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardSheen, setCardSheen] = useState({ x: 50, y: 50, active: false });

  const handleMouseMoveCard = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCardSheen({ x, y, active: true });
  };

  const handleMouseLeaveCard = () => {
    setCardSheen((prev) => ({ ...prev, active: false }));
  };

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
    <div className="relative min-h-screen w-full flex flex-col justify-between select-none z-10">
      {/* Symmetrical Top Header */}
      <header className="sticky top-0 z-40 w-full flex items-center justify-between py-4 px-6 sm:px-12 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <SynLogo size={32} className="shrink-0 transition-transform duration-300 hover:scale-105" />
          <span className="text-[var(--text-primary)] font-semibold text-lg tracking-tight leading-none">
            SynCine
          </span>
        </div>

        {/* Center: Documentation Navigation */}
        <nav className="hidden sm:flex items-center">
          <button
            type="button"
            onClick={onOpenDocs}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            <BookOpen size={14} className="text-[var(--accent)]" />
            <span>Documentation</span>
          </button>
        </nav>

        {/* Right: Controls & Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Docs Mobile Trigger */}
          <button
            type="button"
            onClick={onOpenDocs}
            className="sm:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
            title="Documentation"
            aria-label="Documentation"
          >
            <BookOpen size={16} />
          </button>

          {/* Theme Switcher (Day/Night Indicator) */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle visual theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Authentication State */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span className="font-medium hidden sm:inline">{currentUser?.name || currentUser?.email}</span>
                <span className="text-[10px] uppercase font-semibold bg-black/[0.08] dark:bg-white/[0.1] px-1.5 py-0.5 rounded text-[var(--text-primary)]">Host</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer"
            >
              <LogIn size={14} />
              <span>Host Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center flex-1 justify-center animate-enter-smooth">
        {/* Clean Hero Presentation */}
        <section className="text-center max-w-xl mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-semibold text-[var(--text-primary)] tracking-tight leading-[1.15] mb-4">
            Shared Cinema, Perfectly Synchronized.
          </h1>

          <p className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed font-normal">
            Watch movies with friends over private peer-to-peer streams with instant audio and video sync.
          </p>
        </section>

        {/* Realistic Glassmorphic Action Card with Interactive Sheen */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMoveCard}
          onMouseLeave={handleMouseLeaveCard}
          className="w-full max-w-lg p-6 sm:p-8 realistic-glass rounded-3xl relative overflow-hidden transition-shadow duration-300"
          style={{
            backgroundImage: cardSheen.active
              ? `radial-gradient(circle 350px at ${cardSheen.x}% ${cardSheen.y}%, rgba(200, 169, 126, 0.08), transparent 80%)`
              : undefined,
          }}
        >
          {/* Subtle Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] mb-6 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setErrorMessage(null);
              }}
              className={`py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center font-medium cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-white/[0.14] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
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
              className={`py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center font-medium cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-white dark:bg-white/[0.14] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span>Join with Code</span>
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-[var(--destructive)] text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="font-bold ml-2 opacity-70 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* User Display Name */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Display Name
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder="Your name"
              maxLength={32}
              className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition"
            />
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                  Watchroom Title
                </label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Movie Night"
                  maxLength={64}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition"
                />
              </div>

              {/* Streaming Pipeline Selection */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                  Streaming Source
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setMediaMode('screen')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      mediaMode === 'screen'
                        ? 'bg-black/[0.05] dark:bg-white/[0.08] border-black/[0.15] dark:border-white/[0.18]'
                        : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.1] dark:hover:border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-xl transition ${
                            mediaMode === 'screen'
                              ? 'bg-[var(--accent)] text-black'
                              : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)]'
                          }`}
                        >
                          <ScreenCastIcon size={16} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Screen Cast</span>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${mediaMode === 'screen' ? 'bg-[var(--accent)]' : 'bg-transparent border border-black/20 dark:border-white/20'}`} />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Share your browser tab or desktop display.
                    </span>
                  </div>

                  <div
                    onClick={() => setMediaMode('local_file')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      mediaMode === 'local_file'
                        ? 'bg-black/[0.05] dark:bg-white/[0.08] border-black/[0.15] dark:border-white/[0.18]'
                        : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.1] dark:hover:border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-xl transition ${
                            mediaMode === 'local_file'
                              ? 'bg-[var(--accent)] text-black'
                              : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)]'
                          }`}
                        >
                          <CinemaReelIcon size={16} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Local File</span>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${mediaMode === 'local_file' ? 'bg-[var(--accent)]' : 'bg-transparent border border-black/20 dark:border-white/20'}`} />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Sync playback of video files from your device.
                    </span>
                  </div>
                </div>
              </div>

              {/* Permanent Room Option */}
              <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <KeyRound size={16} className={isPermanent ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'} />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      Permanent Room
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isAuthenticated
                        ? 'Room URL remains permanently active'
                        : 'Sign in to keep room URL active beyond 3 hours'}
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
                className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black font-semibold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm group hover:scale-[1.01]"
              >
                <span>{isLoading ? 'Creating Room...' : 'Start Watchroom'}</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                  Room Code or Link
                </label>
                <input
                  type="text"
                  required
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Paste room code or invite link"
                  maxLength={100}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isAuthenticating || !joinRoomId.trim() || !userName.trim()}
                className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black font-semibold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm group hover:scale-[1.01]"
              >
                <span>{isLoading ? 'Connecting...' : 'Join Watchroom'}</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Symmetrical Clean Footer with Privacy & Terms */}
      <footer className="w-full mx-auto py-6 px-6 sm:px-12 border-t border-black/[0.06] dark:border-white/[0.06] text-xs text-[var(--text-tertiary)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span>SynCine (c) 2026</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            <Shield size={13} />
            <span>Privacy Policy</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={onOpenTerms}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            <FileText size={13} />
            <span>Terms of Service</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={onOpenDocs}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            Documentation
          </button>
        </div>
      </footer>
    </div>
  );
};
