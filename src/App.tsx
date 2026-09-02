import React, { useState, useEffect } from 'react';
import {
  ensureAnonymousSession,
  logoutUser,
  databases,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  ID,
  Permission,
  Role,
  RoomDocument,
  MAX_PARTICIPANTS
} from './lib/appwrite';
import { Lobby } from './components/Lobby';
import { RoomView } from './components/RoomView';
import { AuthModal } from './components/AuthModal';
import { LiquidGlassFilters } from './components/LiquidGlassFilters';
import { ShaderCanvas } from './components/ShaderCanvas';
import { Sun, Moon } from 'lucide-react';
import type { Models } from 'appwrite';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [userName, setUserName] = useState<string>('Cinephile ' + Math.floor(1000 + Math.random() * 9000));
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [initialRoomParam, setInitialRoomParam] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('syncine-theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Apply theme class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('syncine-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    async function init() {
      try {
        const user = await ensureAnonymousSession();
        setCurrentUser(user);
        if (user.name && !user.name.startsWith('Guest ')) {
          setUserName(user.name);
        }

        const params = new URLSearchParams(window.location.search);
        const roomFromUrl = params.get('room');
        if (roomFromUrl) {
          const cleanId = roomFromUrl.includes('?room=')
            ? roomFromUrl.split('?room=')[1]
            : roomFromUrl;
          setInitialRoomParam(cleanId.trim());
        }
      } catch (err) {
        console.error('Authentication initialization error:', err);
      } finally {
        setIsAuthenticating(false);
      }
    }

    init();
  }, []);

  const handleCreateRoom = async (name: string, mediaMode: 'screen' | 'local_file', isPermanent: boolean) => {
    if (!currentUser) return;

    const newRoomId = ID.unique();
    const expiresAt = isPermanent
      ? ''
      : new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    await databases.createDocument<RoomDocument>(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.ROOMS,
      newRoomId,
      {
        name,
        hostId: currentUser.$id,
        mediaMode,
        participantCount: 1,
        maxParticipants: MAX_PARTICIPANTS,
        syncState: '',
        isPermanent,
        expiresAt
      },
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ]
    );

    window.history.pushState({}, '', `?room=${newRoomId}`);
    setActiveRoomId(newRoomId);
  };

  const handleJoinRoom = async (rawInput: string) => {
    let cleanRoomId = rawInput.trim();
    if (cleanRoomId.includes('?room=')) {
      cleanRoomId = cleanRoomId.split('?room=')[1].split('&')[0];
    }

    const doc = await databases.getDocument<RoomDocument>(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.ROOMS,
      cleanRoomId
    );

    if (!doc) {
      throw new Error('Watchroom not found. Please verify the Room Code.');
    }

    if (!doc.isPermanent && doc.expiresAt) {
      const expirationTime = new Date(doc.expiresAt).getTime();
      if (Date.now() > expirationTime) {
        throw new Error('This watchroom has expired (3-hour guest buffer exceeded).');
      }
    }

    if ((doc.participantCount || 1) >= MAX_PARTICIPANTS && doc.hostId !== currentUser?.$id) {
      throw new Error(`Watchroom is full (Maximum ${MAX_PARTICIPANTS} participants allowed).`);
    }

    window.history.pushState({}, '', `?room=${cleanRoomId}`);
    setActiveRoomId(cleanRoomId);
  };

  const handleLeaveRoom = () => {
    window.history.pushState({}, '', window.location.pathname);
    setActiveRoomId(null);
    setInitialRoomParam('');
  };

  const handleAuthSuccess = (user: Models.User<Models.Preferences>) => {
    setCurrentUser(user);
    if (user.name) {
      setUserName(user.name);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticating(true);
    try {
      const guestUser = await logoutUser();
      setCurrentUser(guestUser);
      setUserName('Cinephile ' + Math.floor(1000 + Math.random() * 9000));
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <>
      {/* Barely perceptible atmospheric canvas */}
      <ShaderCanvas />

      {/* Procedural SVG filters */}
      <LiquidGlassFilters />

      {/* Film grain texture at reduced opacity */}
      <div className="film-grain-layer" />

      {/* Dark/Light mode toggle -- fixed position */}
      <button
        type="button"
        onClick={() => setIsDark(!isDark)}
        className="fixed top-4 right-4 z-[60] p-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-all duration-200 cursor-pointer backdrop-blur-xl"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Auth modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {activeRoomId && currentUser ? (
        <RoomView
          roomId={activeRoomId}
          currentUserId={currentUser.$id}
          currentUserName={userName}
          onLeave={handleLeaveRoom}
        />
      ) : (
        <Lobby
          currentUser={currentUser}
          userName={userName}
          onUserNameChange={setUserName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          initialRoomId={initialRoomParam}
          isAuthenticating={isAuthenticating}
        />
      )}
    </>
  );
};

export default App;
