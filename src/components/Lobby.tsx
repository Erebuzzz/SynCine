import React, { useState, useRef, useEffect } from 'react';
import {
  SynLogo
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
  FileText,
  User,
  Settings,
  Calendar,
  Link2,
  ChevronDown,
  Lock,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Tv,
  Film
} from 'lucide-react';
import type { Models } from 'appwrite';
import { formatRoomCode } from '../lib/appwrite';
import { getLocalPermanentRooms, PermanentRoomItem } from './PermanentLinksModal';
import { ThemeMode } from '../lib/time-cycle';

interface LobbyProps {
  currentUser: Models.User<Models.Preferences> | null;
  userName: string;
  onUserNameChange: (name: string) => void;
  avatarUrl?: string;
  themeMode?: ThemeMode;
  onCreateRoom: (name: string, mediaMode: 'screen' | 'local_file' | 'youtube', isPermanent: boolean, youtubeUrl?: string) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
  onOpenAuth: () => void;
  onOpenDocs: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenProfile: () => void;
  onOpenPermanentLinks: () => void;
  onOpenScheduler: () => void;
  onOpenSettings: () => void;
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
  avatarUrl = '',
  onCreateRoom,
  onJoinRoom,
  onOpenAuth,
  onOpenDocs,
  onOpenPrivacy,
  onOpenTerms,
  onOpenProfile,
  onOpenPermanentLinks,
  onOpenScheduler,
  onOpenSettings,
  onLogout,
  isDark,
  themeMode = 'auto',
  onToggleTheme,
  initialRoomId = '',
  isAuthenticating
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomId ? 'join' : 'create');
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState(initialRoomId);
  const [isPermanent, setIsPermanent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile Dropdown Popover state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Permanent Rooms on Home
  const [permanentRooms, setPermanentRooms] = useState<PermanentRoomItem[]>([]);
  const [copiedHomeRoomId, setCopiedHomeRoomId] = useState<string | null>(null);

  // Card mouse-tracking interactive sheen
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardSheen, setCardSheen] = useState({ x: 50, y: 50, active: false });

  const isAuthenticated = Boolean(currentUser?.email && currentUser.email.length > 0);
  const effectiveDisplayName = currentUser?.name || userName || 'Guest';

  // Load permanent rooms
  useEffect(() => {
    setPermanentRooms(getLocalPermanentRooms());
  }, [isProfileMenuOpen, activeTab]);

  // Click outside listener for profile menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !userName.trim()) return;

    if (isPermanent && !isAuthenticated) {
      onOpenAuth();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onCreateRoom(roomName.trim(), 'screen', isPermanent);
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

  const handleCopyHomeRoom = (id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/${formatRoomCode(id)}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedHomeRoomId(id);
    setTimeout(() => setCopiedHomeRoomId(null), 2000);
  };

  const handleShareHomeRoom = async (room: PermanentRoomItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/${formatRoomCode(room.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SynCine Watchroom: ${room.name}`,
          text: `Join my permanent cinema watchroom on SynCine!`,
          url: fullUrl
        });
        return;
      } catch {}
    }
    handleCopyHomeRoom(room.id);
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

        {/* Right: Controls & Interactive Profile Button */}
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
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer flex items-center gap-1.5"
            title={
              themeMode === 'auto'
                ? `Auto Real-Time Theme (${isDark ? 'Night' : 'Day'} Mode active) · Click to switch to Light`
                : themeMode === 'light'
                ? 'Light Theme · Click to switch to Dark'
                : 'Dark Theme · Click to switch to Auto Real-Time'
            }
            aria-label="Toggle visual theme"
          >
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
            {themeMode === 'auto' && (
              <span className="text-[10px] font-bold text-[var(--accent)] hidden sm:inline uppercase tracking-wider">
                Auto
              </span>
            )}
          </button>

          {/* Functional Profile Name Button & Dropdown Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-xs transition cursor-pointer group"
              title="Profile & Options"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={effectiveDisplayName}
                  className="w-5 h-5 rounded-full object-cover border border-[var(--accent)]/50"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-bold text-[10px] flex items-center justify-center border border-[var(--accent)]/40">
                  {effectiveDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-semibold text-[var(--text-primary)] max-w-[120px] truncate hidden min-[360px]:inline">
                {effectiveDisplayName}
              </span>
              <ChevronDown
                size={13}
                className={`text-[var(--text-secondary)] transition-transform duration-200 ${
                  isProfileMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Popover */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 p-2 bg-white/95 dark:bg-[#151518]/95 backdrop-blur-xl rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl z-50 animate-enter-smooth select-none">
                {/* User Info Header */}
                <div className="px-3 py-2.5 mb-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.04] flex items-center gap-2.5">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={effectiveDisplayName}
                      className="w-8 h-8 rounded-full object-cover border border-[var(--accent)]/60 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-bold text-xs flex items-center justify-center border border-[var(--accent)]/50 shrink-0">
                      {effectiveDisplayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {effectiveDisplayName}
                    </div>
                    <div className="text-[10px] text-black/50 dark:text-white/50 truncate">
                      {isAuthenticated ? currentUser?.email : 'Guest Session'}
                    </div>
                  </div>
                </div>

                {/* Menu Item: Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer text-left"
                >
                  <User size={15} className="text-[var(--accent)]" />
                  <div>
                    <div className="leading-tight">Profile</div>
                    <div className="text-[10px] text-black/45 dark:text-white/45">Change name & photo</div>
                  </div>
                </button>

                {/* Menu Item: Permanent Links */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (isAuthenticated) {
                      onOpenPermanentLinks();
                    } else {
                      onOpenAuth();
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Link2 size={15} className="text-[var(--accent)]" />
                    <div>
                      <div className="leading-tight">Permanent Links</div>
                      <div className="text-[10px] text-black/45 dark:text-white/45">Manage unexpiring rooms</div>
                    </div>
                  </div>
                  {!isAuthenticated && <Lock size={12} className="text-black/40 dark:text-white/40" />}
                </button>

                {/* Menu Item: Calendar & Scheduler */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (isAuthenticated) {
                      onOpenScheduler();
                    } else {
                      onOpenAuth();
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar size={15} className="text-[var(--accent)]" />
                    <div>
                      <div className="leading-tight">Schedule Meeting</div>
                      <div className="text-[10px] text-black/45 dark:text-white/45">Calendar & email invites</div>
                    </div>
                  </div>
                  {!isAuthenticated && <Lock size={12} className="text-black/40 dark:text-white/40" />}
                </button>

                {/* Menu Item: Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer text-left"
                >
                  <Settings size={15} className="text-[var(--accent)]" />
                  <div>
                    <div className="leading-tight">Settings</div>
                    <div className="text-[10px] text-black/45 dark:text-white/45">Camera, audio & defaults</div>
                  </div>
                </button>

                <div className="my-1.5 border-t border-black/[0.06] dark:border-white/[0.06]" />

                {/* Menu Item: Auth action */}
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#FF453A] hover:bg-[#FF453A]/10 transition cursor-pointer text-left"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)]/10 transition cursor-pointer text-left"
                  >
                    <LogIn size={15} />
                    <span>Sign In as Host</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 py-8 sm:py-16 flex flex-col items-center flex-1 justify-center animate-enter-smooth">
        {/* Clean Hero Presentation */}
        <section className="text-center max-w-xl mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-[var(--text-primary)] tracking-tight leading-[1.15] mb-3 sm:mb-4">
            Shared Cinema, Perfectly Synchronized.
          </h1>

          <p className="text-[var(--text-secondary)] text-xs sm:text-base leading-relaxed font-normal">
            Watch movies with friends over private peer-to-peer streams with instant audio and video sync.
          </p>
        </section>

        {/* Realistic Glassmorphic Action Card with Interactive Sheen */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMoveCard}
          onMouseLeave={handleMouseLeaveCard}
          className="w-full max-w-lg p-5 sm:p-8 realistic-glass rounded-2xl sm:rounded-3xl relative overflow-hidden transition-shadow duration-300"
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
              className={`py-2.5 rounded-xl font-medium transition cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-white/10 text-[var(--text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Host Watchroom
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setErrorMessage(null);
              }}
              className={`py-2.5 rounded-xl font-medium transition cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-white dark:bg-white/10 text-[var(--text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Join with Code
            </button>
          </div>

          {/* Feedback Message */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-[var(--destructive)] text-xs flex items-center justify-between">
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
                  placeholder="e.g. c7k-9m2-p4q or invite link"
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

        {/* Permanent Rooms Section on Home (Signed-In Hosts) */}
        {isAuthenticated && permanentRooms.length > 0 && (
          <div className="w-full max-w-lg mt-8 p-5 sm:p-6 realistic-glass rounded-2xl sm:rounded-3xl animate-enter-smooth border border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                <Link2 size={15} className="text-[var(--accent)]" />
                <span>Your Permanent Rooms</span>
              </div>
              <button
                type="button"
                onClick={onOpenPermanentLinks}
                className="text-[11px] text-[var(--accent)] hover:underline font-semibold cursor-pointer"
              >
                View All ({permanentRooms.length})
              </button>
            </div>

            <div className="space-y-2.5">
              {permanentRooms.slice(0, 3).map((room) => {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const fullUrl = `${origin}/?room=${room.id}`;
                const isCopied = copiedHomeRoomId === room.id;

                return (
                  <div
                    key={room.id}
                    className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
                          {room.mediaMode === 'screen' ? <Tv size={11} /> : <Film size={11} />}
                        </span>
                        <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                          {room.name}
                        </span>
                        <span className="text-[9px] font-mono px-1 rounded bg-black/[0.05] dark:bg-white/[0.06] text-black/60 dark:text-white/60">
                          {formatRoomCode(room.id)}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-black/40 dark:text-white/40 truncate">
                        {fullUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyHomeRoom(room.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                          isCopied
                            ? 'bg-[#30D158]/15 text-[#30D158]'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-black/75 dark:text-white/75'
                        }`}
                        title="Copy URL"
                      >
                        {isCopied ? <Check size={11} /> : <Copy size={11} />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareHomeRoom(room)}
                        className="p-1 rounded bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-black/75 dark:text-white/75 transition cursor-pointer"
                        title="Share"
                      >
                        <Share2 size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onJoinRoom(room.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--accent)] text-black text-[11px] font-bold hover:opacity-90 transition cursor-pointer"
                        title="Enter Room"
                      >
                        <ExternalLink size={11} />
                        <span>Launch</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Symmetrical Clean Footer with Privacy & Terms */}
      <footer className="w-full mx-auto py-5 sm:py-6 px-4 sm:px-12 border-t border-black/[0.06] dark:border-white/[0.06] text-xs text-[var(--text-tertiary)] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div>
          <span>SynCine (c) 2026</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs">
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
