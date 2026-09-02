import React, { useState } from 'react';
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
  BookOpen,
  Sun,
  Moon
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
      {/* Symmetrical Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full flex items-center justify-between py-3.5 px-6 sm:px-10 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <SynLogo size={32} className="shrink-0" />
          <span className="text-[var(--text-primary)] font-bold text-base tracking-tight leading-none">
            SynCine
          </span>
        </div>

        {/* Center: System Architecture & Docs Link */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            <BookOpen size={13} />
            <span>Architecture & Documentation</span>
          </button>
        </nav>

        {/* Right: Controls & Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Documentation Mobile Trigger */}
          <button
            type="button"
            onClick={onOpenDocs}
            className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
            title="Documentation"
            aria-label="Documentation"
          >
            <BookOpen size={16} />
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle visual theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Auth State Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span className="font-medium hidden sm:inline">{currentUser?.name || currentUser?.email}</span>
                <span className="text-[10px] font-bold bg-black/[0.08] dark:bg-white/[0.1] px-1.5 py-0.5 rounded text-[var(--text-primary)]">Host</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer"
            >
              <LogIn size={13} />
              <span>Host Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center flex-1 justify-center">
        {/* Editorial Hero */}
        <section className="text-center max-w-2xl mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold text-[var(--text-primary)] tracking-tight leading-[1.12] mb-4">
            Shared Cinema, Perfectly Synchronized.
          </h1>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-normal">
            Real-time peer-to-peer watchrooms with sub-350ms timestamp synchronization and zero server video storage.
          </p>
        </section>

        {/* Action Panel Container */}
        <div className="w-full max-w-lg p-6 sm:p-8 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-xl">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl border border-black/[0.06] dark:border-white/[0.08] mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setErrorMessage(null);
              }}
              className={`py-2.5 text-xs font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-white/[0.12] text-[var(--text-primary)] shadow-sm'
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
              className={`py-2.5 text-xs font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-white dark:bg-white/[0.12] text-[var(--text-primary)] shadow-sm'
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
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Your Display Name
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder="Your name"
              maxLength={32}
              className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-xs rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
            />
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                  Watchroom Title
                </label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Blade Runner 2049"
                  maxLength={64}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-xs rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
                />
              </div>

              {/* Streaming Pipeline Selection */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                  Streaming Pipeline
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setMediaMode('screen')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col ${
                      mediaMode === 'screen'
                        ? 'bg-black/[0.06] dark:bg-white/[0.08] border-black/[0.14] dark:border-white/[0.18]'
                        : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.1] dark:hover:border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          mediaMode === 'screen'
                            ? 'bg-[var(--accent)] text-black'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)]'
                        }`}
                      >
                        <ScreenCastIcon size={16} />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Screen Cast</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] leading-snug">
                      Hardware H.264 tab or desktop broadcast.
                    </span>
                  </div>

                  <div
                    onClick={() => setMediaMode('local_file')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col ${
                      mediaMode === 'local_file'
                        ? 'bg-black/[0.06] dark:bg-white/[0.08] border-black/[0.14] dark:border-white/[0.18]'
                        : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.1] dark:hover:border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          mediaMode === 'local_file'
                            ? 'bg-[var(--accent)] text-black'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)]'
                        }`}
                      >
                        <CinemaReelIcon size={16} />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Local File Sync</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] leading-snug">
                      Local video file sync with zero server upload.
                    </span>
                  </div>
                </div>
              </div>

              {/* Permanent Room Option */}
              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <KeyRound size={15} className={isPermanent ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'} />
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
                className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black font-semibold text-xs rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>{isLoading ? 'Creating Watchroom...' : 'Start Watchroom'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                  Room Code or URL
                </label>
                <input
                  type="text"
                  required
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="e.g. 6a97c0ed or paste full link"
                  maxLength={100}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-xs rounded-xl px-4 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isAuthenticating || !joinRoomId.trim() || !userName.trim()}
                className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black font-semibold text-xs rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>{isLoading ? 'Connecting...' : 'Join Watchroom'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="w-full mx-auto py-6 px-6 border-t border-black/[0.06] dark:border-white/[0.06] text-center text-xs text-[var(--text-tertiary)] font-normal flex flex-col sm:flex-row items-center justify-between gap-2 max-w-4xl">
        <span>SynCine (c) 2026</span>
        <button
          type="button"
          onClick={onOpenDocs}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
        >
          Documentation
        </button>
      </footer>
    </div>
  );
};
