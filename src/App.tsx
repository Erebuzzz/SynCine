import React, { useState, useEffect } from 'react';
import {
  ensureAnonymousSession,
  logoutUser,
  databases,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  generateRoomCode,
  normalizeRoomCode,
  formatRoomCode,
  extractYouTubeId,
  Permission,
  Role,
  RoomDocument,
  MAX_PARTICIPANTS
} from './lib/appwrite';
import {
  getISTCycleState,
  applyISTReflectionCSS,
  ThemeMode,
  getSavedThemeMode,
  setSavedThemeMode,
  resolveThemeIsDark
} from './lib/time-cycle';
import { applyPerformanceMode } from './lib/performance-detect';
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
import { ProfileModal } from './components/ProfileModal';
import { PermanentLinksModal, saveLocalPermanentRoom } from './components/PermanentLinksModal';
import { MeetingSchedulerModal } from './components/MeetingSchedulerModal';
import { SettingsModal } from './components/SettingsModal';
import { RejoinBuffer } from './components/RejoinBuffer';
import {
  getAudioInputDevices,
  getAudioOutputDevices,
  getVideoInputDevices,
  captureUserMedia,
  MediaDeviceInfoItem,
  VideoResolution
} from './lib/media-capture';
import type { Models } from 'appwrite';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syncine-user-name') || '';
    }
    return '';
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syncine-user-avatar') || '';
    }
    return '';
  });
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [justLeftRoom, setJustLeftRoom] = useState<{ roomId: string; roomName?: string } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [initialRoomParam, setInitialRoomParam] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isPermanentLinksModalOpen, setIsPermanentLinksModalOpen] = useState<boolean>(false);
  const [isSchedulerModalOpen, setIsSchedulerModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [is404, setIs404] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p === '/404') return true;
      const rawPath = p.replace(/^\/(?:room\/|join\/)?/, '').replace(/\/$/, '').trim();
      if (rawPath && rawPath !== 'lobby') {
        const clean = normalizeRoomCode(rawPath);
        if (clean.length < 6) return true;
      }
    }
    return false;
  });

  // Device settings for global SettingsModal
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfoItem[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfoItem[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfoItem[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState<string>('');
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [selectedResolution, setSelectedResolution] = useState<VideoResolution>('1080p');
  const [isNoiseSuppressionEnabled, setIsNoiseSuppressionEnabled] = useState(true);
  const [isCameraMirrored, setIsCameraMirrored] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syncine-camera-mirrored') === 'true';
    }
    return false;
  });
  const [settingsPreviewStream, setSettingsPreviewStream] = useState<MediaStream | null>(null);

  // Theme mode: 'auto' (real-time day/night sync), 'light', or 'dark'
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getSavedThemeMode());
  const [isDark, setIsDark] = useState<boolean>(() => resolveThemeIsDark(getSavedThemeMode()));

  // Detect software rendering and apply zero-lag optimizations on mount
  useEffect(() => {
    applyPerformanceMode();
  }, []);

  // Apply theme class and dynamic IST reflection system with active real-time clock syncing
  useEffect(() => {
    const root = document.documentElement;
    const dark = resolveThemeIsDark(themeMode);
    setIsDark(dark);

    if (dark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    const state = getISTCycleState();
    applyISTReflectionCSS(state, dark);

    // Active timer to ensure real-time theme switches accurately when the clock turns
    const interval = setInterval(() => {
      const savedMode = getSavedThemeMode();
      if (savedMode !== themeMode) {
        setThemeMode(savedMode);
        return;
      }

      const currentState = getISTCycleState();
      if (themeMode === 'auto') {
        const autoDark = resolveThemeIsDark('auto');
        setIsDark(autoDark);
        if (autoDark) {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.remove('dark');
          root.classList.add('light');
        }
        applyISTReflectionCSS(currentState, autoDark);
      } else {
        applyISTReflectionCSS(currentState, dark);
      }
    }, 10000);

    const handleExternalThemeChange = () => {
      const savedMode = getSavedThemeMode();
      setThemeMode(savedMode);
    };

    window.addEventListener('storage', handleExternalThemeChange);
    window.addEventListener('syncine-theme-change', handleExternalThemeChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleExternalThemeChange);
      window.removeEventListener('syncine-theme-change', handleExternalThemeChange);
    };
  }, [themeMode]);

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
        if (user.prefs?.avatar) {
          setAvatarUrl(user.prefs.avatar);
        }

        // Extract room from query (?room=... or ?id=...) or clean path (/e89-ag8-zm5)
        const params = new URLSearchParams(window.location.search);
        const queryRoom = params.get('room') || params.get('id');
        let targetRoomCode = queryRoom ? normalizeRoomCode(queryRoom) : '';

        if (!targetRoomCode && window.location.pathname) {
          const rawPath = window.location.pathname.replace(/^\/(?:room\/|join\/)?/, '').replace(/\/$/, '').trim();
          if (rawPath && rawPath !== '404' && rawPath !== 'lobby') {
            const cleanPath = normalizeRoomCode(rawPath);
            if (cleanPath.length >= 6) {
              targetRoomCode = cleanPath;
            } else {
              setIs404(true);
            }
          }
        }

        if (targetRoomCode) {
          setInitialRoomParam(targetRoomCode);
          // Directly enter room join interface (Green Room)
          setActiveRoomId(targetRoomCode);
        }
      } catch (err) {
        console.error('Authentication initialization error:', err);
      } finally {
        setIsAuthenticating(false);
      }
    }

    init();
  }, []);

  // Sync settings modal preview stream and available devices
  useEffect(() => {
    if (isSettingsModalOpen && !activeRoomId) {
      getAudioInputDevices().then(setAudioInputDevices);
      getAudioOutputDevices().then(setAudioOutputDevices);
      getVideoInputDevices().then(setVideoInputDevices);

      captureUserMedia(true)
        .then((s) => setSettingsPreviewStream(s))
        .catch(console.warn);
    } else {
      if (settingsPreviewStream) {
        settingsPreviewStream.getTracks().forEach((t) => t.stop());
        setSettingsPreviewStream(null);
      }
    }
  }, [isSettingsModalOpen, activeRoomId]);

  const handleSelectAudioInputDevice = async (deviceId: string) => {
    setSelectedAudioDeviceId(deviceId);
    localStorage.setItem('syncine-preferred-audio-input', deviceId);
  };

  const handleSelectAudioOutputDevice = async (deviceId: string) => {
    setSelectedAudioOutputDeviceId(deviceId);
    localStorage.setItem('syncine-preferred-audio-output', deviceId);
  };

  const handleSelectVideoInputDevice = async (deviceId: string) => {
    setSelectedVideoDeviceId(deviceId);
    localStorage.setItem('syncine-preferred-video-input', deviceId);
  };

  const handleSelectResolution = async (res: VideoResolution) => {
    setSelectedResolution(res);
    localStorage.setItem('syncine-preferred-resolution', res);
  };

  const handleToggleNoiseSuppression = async (enabled: boolean) => {
    setIsNoiseSuppressionEnabled(enabled);
    localStorage.setItem('syncine-noise-suppression', enabled ? 'true' : 'false');
  };

  const handleToggleCameraMirror = (mirrored: boolean) => {
    setIsCameraMirrored(mirrored);
    localStorage.setItem('syncine-camera-mirrored', mirrored ? 'true' : 'false');
  };

  const handleToggleTheme = () => {
    // Cycles through Auto (real-time sync) -> Light -> Dark -> Auto
    let nextMode: ThemeMode = 'auto';
    if (themeMode === 'auto') {
      nextMode = isDark ? 'light' : 'dark';
    } else if (themeMode === 'light') {
      nextMode = 'dark';
    } else {
      nextMode = 'auto';
    }
    setThemeMode(nextMode);
    setSavedThemeMode(nextMode);
  };

  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    setSavedThemeMode(mode);
  };

  const handleCreateRoom = async (
    name: string,
    mediaMode: 'screen' | 'local_file' | 'youtube',
    isPermanent: boolean,
    youtubeUrl?: string
  ) => {
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

    const ytId = youtubeUrl ? extractYouTubeId(youtubeUrl) : undefined;

    const payload: any = {
      name,
      hostId: user.$id,
      mediaMode,
      participantCount: 1,
      maxParticipants: MAX_PARTICIPANTS,
      syncState: '',
      isPermanent,
      expiresAt
    };

    if (ytId) {
      payload.youtubeVideoId = ytId;
      payload.youtubeUrl = youtubeUrl;
    }

    await databases.createDocument<RoomDocument>(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.ROOMS,
      newRoomId,
      payload,
      [
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ]
    );

    if (isPermanent) {
      saveLocalPermanentRoom({
        id: newRoomId,
        name,
        mediaMode,
        createdAt: new Date().toISOString()
      });
    }

    window.history.pushState({}, '', `/${formatRoomCode(newRoomId)}`);
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

      const occupancy = typeof doc.participantCount === 'number' ? doc.participantCount : 0;
      if (occupancy >= MAX_PARTICIPANTS && doc.hostId !== currentUser?.$id) {
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
    window.history.pushState({}, '', '/');
    if (activeRoomId) {
      setJustLeftRoom({ roomId: activeRoomId });
    }
    setActiveRoomId(null);
    setInitialRoomParam('');
  };

  const handleAuthSuccess = (user: Models.User<Models.Preferences>) => {
    setCurrentUser(user);
    if (user.name) {
      setUserName(user.name);
      localStorage.setItem('syncine-user-name', user.name);
    }
    if (user.prefs?.avatar) {
      setAvatarUrl(user.prefs.avatar);
      localStorage.setItem('syncine-user-avatar', user.prefs.avatar);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticating(true);
    try {
      const guestUser = await logoutUser();
      setCurrentUser(guestUser);
      setUserName('');
      setAvatarUrl('');
      localStorage.removeItem('syncine-user-avatar');
      localStorage.removeItem('syncine-user-name');
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
          isDark={isDark}
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
        />
      </>
    );
  }

  return (
    <>
      {/* Custom transparent accent cursor */}
      <CustomCursor />

      {/* Subtle atmospheric canvas and film grain on Lobby only (disabled in watchrooms to guarantee smooth, zero-flicker hardware video playback) */}
      {!activeRoomId && (
        <>
          <ShaderCanvas isDark={isDark} />
          <LiquidGlassFilters />
          <div className="film-grain-layer" />
        </>
      )}

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

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        userName={userName}
        onSaveName={(name) => {
          setUserName(name);
          localStorage.setItem('syncine-user-name', name);
        }}
        avatarUrl={avatarUrl}
        onSaveAvatar={(url) => {
          setAvatarUrl(url);
          localStorage.setItem('syncine-user-avatar', url);
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Permanent Links Modal */}
      <PermanentLinksModal
        isOpen={isPermanentLinksModalOpen}
        onClose={() => setIsPermanentLinksModalOpen(false)}
        currentUser={currentUser}
        onJoinRoom={handleJoinRoom}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Meeting Scheduler & Calendar Modal */}
      <MeetingSchedulerModal
        isOpen={isSchedulerModalOpen}
        onClose={() => setIsSchedulerModalOpen(false)}
        currentUser={currentUser}
        onJoinRoom={handleJoinRoom}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Global Settings Modal (Lobby) */}
      <SettingsModal
        isOpen={isSettingsModalOpen && !activeRoomId}
        onClose={() => setIsSettingsModalOpen(false)}
        audioInputDevices={audioInputDevices}
        audioOutputDevices={audioOutputDevices}
        selectedAudioDeviceId={selectedAudioDeviceId}
        selectedAudioOutputDeviceId={selectedAudioOutputDeviceId}
        onSelectAudioInputDevice={handleSelectAudioInputDevice}
        onSelectAudioOutputDevice={handleSelectAudioOutputDevice}
        isNoiseSuppressionEnabled={isNoiseSuppressionEnabled}
        onToggleNoiseSuppression={handleToggleNoiseSuppression}
        videoInputDevices={videoInputDevices}
        selectedVideoDeviceId={selectedVideoDeviceId}
        onSelectVideoInputDevice={handleSelectVideoInputDevice}
        selectedResolution={selectedResolution}
        onSelectResolution={handleSelectResolution}
        previewStream={settingsPreviewStream}
        isCameraMirrored={isCameraMirrored}
        onToggleCameraMirror={handleToggleCameraMirror}
        themeMode={themeMode}
        onSetThemeMode={handleSetThemeMode}
      />

      {activeRoomId && currentUser ? (
        <RoomView
          roomId={activeRoomId}
          currentUserId={currentUser.$id}
          currentUserName={userName || 'Host'}
          onLeave={handleLeaveRoom}
          themeMode={themeMode}
          onSetThemeMode={handleSetThemeMode}
        />
      ) : justLeftRoom ? (
        <RejoinBuffer
          roomId={justLeftRoom.roomId}
          roomName={justLeftRoom.roomName}
          onRejoin={() => {
            setActiveRoomId(justLeftRoom.roomId);
            setJustLeftRoom(null);
          }}
          onReturnHome={() => setJustLeftRoom(null)}
        />
      ) : (
        <Lobby
          currentUser={currentUser}
          userName={userName}
          onUserNameChange={setUserName}
          avatarUrl={avatarUrl}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenDocs={() => setIsDocsModalOpen(true)}
          onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          onOpenTerms={() => setIsTermsModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenPermanentLinks={() => setIsPermanentLinksModalOpen(true)}
          onOpenScheduler={() => setIsSchedulerModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onLogout={handleLogout}
          isDark={isDark}
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
          initialRoomId={initialRoomParam}
          isAuthenticating={isAuthenticating}
        />
      )}
    </>
  );
};

export default App;
