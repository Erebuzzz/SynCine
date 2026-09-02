import React, { useState, useEffect } from 'react';
import {
  ensureAnonymousSession,
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
import { LiquidGlassFilters } from './components/LiquidGlassFilters';

export const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('Guest ' + Math.floor(1000 + Math.random() * 9000));
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [initialRoomParam, setInitialRoomParam] = useState<string>('');

  // Initialize Anonymous Auth and parse URL query parameters
  useEffect(() => {
    async function init() {
      try {
        const user = await ensureAnonymousSession();
        setCurrentUserId(user.$id);

        const params = new URLSearchParams(window.location.search);
        const roomFromUrl = params.get('room');
        if (roomFromUrl) {
          setInitialRoomParam(roomFromUrl);
        }
      } catch (err) {
        console.error('Authentication initialization error:', err);
      } finally {
        setIsAuthenticating(false);
      }
    }

    init();
  }, []);

  const handleCreateRoom = async (name: string, mediaMode: 'screen' | 'local_file') => {
    const newRoomId = ID.unique();

    await databases.createDocument<RoomDocument>(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.ROOMS,
      newRoomId,
      {
        name,
        hostId: currentUserId,
        mediaMode,
        participantCount: 1,
        maxParticipants: MAX_PARTICIPANTS,
        syncState: ''
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

  const handleJoinRoom = async (roomId: string) => {
    const doc = await databases.getDocument<RoomDocument>(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.ROOMS,
      roomId
    );

    if (!doc) {
      throw new Error('Room not found. Please verify the Room ID.');
    }

    if ((doc.participantCount || 1) >= MAX_PARTICIPANTS && doc.hostId !== currentUserId) {
      throw new Error(`Room is full (Maximum ${MAX_PARTICIPANTS} users allowed).`);
    }

    window.history.pushState({}, '', `?room=${roomId}`);
    setActiveRoomId(roomId);
  };

  const handleLeaveRoom = () => {
    window.history.pushState({}, '', window.location.pathname);
    setActiveRoomId(null);
    setInitialRoomParam('');
  };

  return (
    <>
      {/* Procedural SVG Filters */}
      <LiquidGlassFilters />

      {/* Subtle 35mm Cinematic Film Grain Texture */}
      <div className="film-grain-layer" />

      {activeRoomId && currentUserId ? (
        <RoomView
          roomId={activeRoomId}
          currentUserId={currentUserId}
          currentUserName={userName}
          onLeave={handleLeaveRoom}
        />
      ) : (
        <Lobby
          currentUserId={currentUserId}
          userName={userName}
          onUserNameChange={setUserName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          initialRoomId={initialRoomParam}
          isAuthenticating={isAuthenticating}
        />
      )}
    </>
  );
};

export default App;
