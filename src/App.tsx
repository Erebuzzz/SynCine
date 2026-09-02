import React, { useState, useEffect } from 'react';
import {
  ensureAnonymousSession,
  logoutUser,
  databases,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  generateRoomCode,
  normalizeRoomCode,
  Permission,
  Role,
  RoomDocument,
  MAX_PARTICIPANTS
} from './lib/appwrite';
import { getISTCycleState, applyISTReflectionCSS } from './lib/time-cycle';
import { Lobby } from './components/Lobby';
import { RoomView } from './components/RoomView';
import { AuthModal } from './components/AuthModal';
import { DocsModal } from './components/DocsModal';
import { PrivacyModal } from './components/PrivacyModal';
import { TermsModal } from './components/TermsModal';
import { NotFound } from './components/NotFound';
import { CustomCursor } from './components/CustomCursor';
import { LiquidGlassFilters } from './components/LiquidGlassFilters';
import { ShaderCanvas } from './components/ShaderCanvas';
import type { Models } from 'appwrite';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [initialRoomParam, setInitialRoomParam] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [is404, setIs404] = useState<boolean>(false);

  // Determine initial theme: User manual preference or Indian Standard Time (IST) Day/Night cycle
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('syncine-theme-manual');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;

      // Automatic IST cycle: Sunrise 06:00 to Sunset 18:30 IST is Light mode, else Dark mode
      const { isDaytime } = getISTCycleState();
      return !isDaytime;
    }
    return true;
  });

  // Apply theme class and dynamic IST reflection system
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    const state = getISTCycleState();
    applyISTReflectionCSS(state, isDark);

    // Periodically update the solar reflection angle
    const interval = setInterval(() => {
      const currentState = getISTCycleState();
      applyISTReflectionCSS(currentState, isDark);
    }, 60000);

    return () => clearInterval(interval);
  }, [isDark]);

  useEffect(() => {
    async function init() {
      try {
        // Check for 404 route
        if (window.location.pathname === '/404') {
          setIs404(true);
        }

        const user = await ensureAnonymousSession();
        setCurrentUser(user);
        if (user.name && !user.name.startsWith('Guest ')) {
          setUserName(user.name);
        }

        const params = new URLSearchParams(window.location.search);
        const roomFromUrl = params.get('room');
        if (roomFromUrl) {
          const cleanId = normalizeRoomCode(roomFromUrl);
          setInitialRoomParam(cleanId);
        }
      } catch (err) {
        console.error('Authentication initialization error:', err);
      } finally {
        setIsAuthenticating(false);
      }
    }

    init();
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem('syncine-theme-manual', nextTheme ? 'dark' : 'light');
    applyISTReflectionCSS(getISTCycleState(), nextTheme);
  };

  const handleCreateRoom = async (name: string, mediaMode: 'screen' | 'local_file', isPermanent: boolean) => {
    let user = currentUser;
    if (!user) {
      user = await ensureAnonymousSession();
      setCurrentUser(user);
    }
    if (!user) {
      throw new Error('Unable to initialize user session. Please check your connection.');
    }

    const newRoomId = generateRoomCode();
    const expiresAt = isPermanent
      ? ''
      : new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    await databases.createDocument<RoomDocument>(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.ROOMS,
      newRoomId,
      {
        name,
        hostId: user.$id,
        mediaMode,
        participantCount: 1,
        maxParticipants: MAX_PARTICIPANTS,
        syncState: '',
        isPermanent,
        expiresAt
      },
      [
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ]
    );

    window.history.pushState({}, '', `?room=${newRoomId}`);
    setActiveRoomId(newRoomId);
  };

  const handleJoinRoom = async (rawInput: string) => {
    let user = currentUser;
    if (!user) {
      try {
        user = await ensureAnonymousSession();
        setCurrentUser(user);
      } catch (err) {
        console.warn('Session check on join:', err);
      }
    }

    let cleanRoomId = normalizeRoomCode(rawInput);

    try {
      let doc: RoomDocument;
      try {
        doc = await databases.getDocument<RoomDocument>(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.ROOMS,
          cleanRoomId
        );
      } catch (initialErr: any) {
        // Fallback: in case of rawInput string directly
        if (cleanRoomId !== rawInput.trim()) {
          doc = await databases.getDocument<RoomDocument>(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.ROOMS,
            rawInput.trim()
          );
          cleanRoomId = rawInput.trim();
        } else {
          throw initialErr;
        }
      }

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
    } catch (err: any) {
      if (err?.code === 404 || err?.message?.includes('not found')) {
        setIs404(true);
      }
      throw err;
    }
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
      setUserName('');
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (is404) {
    return (
      <>
        <CustomCursor />
        <NotFound
          onReturnHome={() => {
            window.history.pushState({}, '', '/');
            setIs404(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* Custom transparent accent cursor */}
      <CustomCursor />

      {/* Subtle atmospheric canvas */}
      <ShaderCanvas />

      {/* Procedural SVG filters */}
      <LiquidGlassFilters />

      {/* Film grain texture at reduced opacity */}
      <div className="film-grain-layer" />

      {/* Technical Documentation Modal */}
      <DocsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Terms of Service Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />

      {/* Host Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {activeRoomId && currentUser ? (
        <RoomView
          roomId={activeRoomId}
          currentUserId={currentUser.$id}
          currentUserName={userName || 'Host'}
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
          onOpenDocs={() => setIsDocsModalOpen(true)}
          onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          onOpenTerms={() => setIsTermsModalOpen(true)}
          onLogout={handleLogout}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          initialRoomId={initialRoomParam}
          isAuthenticating={isAuthenticating}
        />
      )}
    </>
  );
};

export default App;
