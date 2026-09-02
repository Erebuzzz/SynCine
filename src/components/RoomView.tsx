import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  databases,
  realtime,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  RoomDocument,
  MAX_PARTICIPANTS,
  RealtimeResponseEvent
} from '../lib/appwrite';
import { WebRTCEngine } from '../lib/webrtc';
import { PlaybackSynchronizer, SyncPacket } from '../lib/sync-engine';
import { captureDisplayMedia, captureUserMedia } from '../lib/media-capture';
import { WatchStage, Participant } from './WatchStage';
import { ChatSidebar } from './ChatSidebar';
import { GreenRoom } from './GreenRoom';

interface RoomViewProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  onLeave: () => void;
}

export const RoomView: React.FC<RoomViewProps> = ({
  roomId,
  currentUserId,
  currentUserName,
  onLeave
}) => {
  const [room, setRoom] = useState<RoomDocument | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | undefined>(undefined);
  const [localFileUrl, setLocalFileUrl] = useState<string | undefined>(undefined);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Google Meet Green Room preview state
  const [hasEnteredStage, setHasEnteredStage] = useState(false);
  const [effectiveUserName, setEffectiveUserName] = useState(currentUserName);

  const webrtcRef = useRef<WebRTCEngine | null>(null);
  const synchronizerRef = useRef<PlaybackSynchronizer | null>(null);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const isHost = room?.hostId === currentUserId;

  // Initial Room Document Fetch & Expiration Validation
  useEffect(() => {
    let isMounted = true;

    async function fetchRoom() {
      try {
        const doc = await databases.getDocument<RoomDocument>(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.ROOMS,
          roomId
        );

        if (!isMounted) return;

        // Verify 3-hour TTL expiration for non-permanent rooms
        if (!doc.isPermanent && doc.expiresAt) {
          const expirationTime = new Date(doc.expiresAt).getTime();
          if (Date.now() > expirationTime) {
            setErrorState('This watchroom has expired (3-hour guest buffer exceeded).');
            return;
          }
        }

        // Check participant capacity
        const currentCount = doc.participantCount || 1;
        if (currentCount >= MAX_PARTICIPANTS && doc.hostId !== currentUserId) {
          setErrorState(`Watchroom is at full capacity (Maximum ${MAX_PARTICIPANTS} participants).`);
          return;
        }

        setRoom(doc);
      } catch (err: any) {
        if (isMounted) {
          setErrorState(err?.message || 'Failed to load watchroom details.');
        }
      }
    }

    fetchRoom();

    return () => {
      isMounted = false;
    };
  }, [roomId, currentUserId]);

  // WebRTC and Synchronizer Setup once user enters through the Green Room
  useEffect(() => {
    if (!hasEnteredStage || !room) return;

    let isMounted = true;

    async function initStage() {
      if (!isMounted || !room) return;

      // Increment participant count for non-host
      if (room.hostId !== currentUserId) {
        const currentCount = room.participantCount || 1;
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.ROOMS,
          roomId,
          { participantCount: Math.min(MAX_PARTICIPANTS, currentCount + 1) }
        ).catch(console.warn);
      }

      // Initialize WebRTC Engine
      const engine = new WebRTCEngine({
        client: databases.client,
        databaseId: APPWRITE_DATABASE_ID,
        roomId,
        currentUserId,
        onRemoteTrackAdded: (peerId, stream) => {
          setParticipants((prev) => {
            const existingIndex = prev.findIndex((p) => p.id === peerId);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], stream };
              return updated;
            }
            return [...prev, { id: peerId, name: `Viewer ${peerId.slice(-4)}`, stream }];
          });

          // Host screen share stream display
          if (stream.getVideoTracks().length > 0 && room.hostId !== currentUserId) {
            setMediaStream(stream);
          }
        },
        onPeerDisconnected: (peerId) => {
          setParticipants((prev) => prev.filter((p) => p.id !== peerId));
        },
        onPeerConnected: (peerId) => {
          console.log(`P2P mesh peer connected: ${peerId}`);
        }
      });

      webrtcRef.current = engine;

      // Handshake with host if viewer
      if (room.hostId !== currentUserId) {
        await engine.initiateConnection(room.hostId);
      }

      // Initialize Playback Synchronizer
      const sync = new PlaybackSynchronizer(
        databases,
        APPWRITE_DATABASE_ID,
        roomId,
        room.hostId === currentUserId
      );
      synchronizerRef.current = sync;
    }

    initStage();

    // Subscribe to Realtime room updates
    const roomChannel = `databases.${APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.ROOMS}.documents.${roomId}`;
    const unsubscribeRoom = realtime.subscribe<RoomDocument>(roomChannel, (event: RealtimeResponseEvent<RoomDocument>) => {
      const updatedDoc = event.payload;
      if (updatedDoc) {
        setRoom(updatedDoc);

        if (updatedDoc.syncState && synchronizerRef.current) {
          try {
            const packet: SyncPacket = JSON.parse(updatedDoc.syncState);
            synchronizerRef.current.applyRemoteUpdate(packet);
          } catch (err) {
            console.warn('Failed to parse syncState packet:', err);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribeRoom();

      if (room && room.hostId !== currentUserId) {
        databases.getDocument<RoomDocument>(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, roomId)
          .then((d) => {
            const newCount = Math.max(1, (d.participantCount || 2) - 1);
            return databases.updateDocument(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, roomId, {
              participantCount: newCount
            });
          })
          .catch(() => {});
      }

      if (webrtcRef.current) {
        webrtcRef.current.destroy();
        webrtcRef.current = null;
      }
      if (synchronizerRef.current) {
        synchronizerRef.current.destroy();
        synchronizerRef.current = null;
      }
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getTracks().forEach((t) => t.stop());
        localMicStreamRef.current = null;
      }
    };
  }, [hasEnteredStage, roomId, currentUserId]);

  const handleGreenRoomJoin = async (
    name: string,
    micEnabled: boolean,
    videoEnabled: boolean,
    presentImmediately: boolean
  ) => {
    setEffectiveUserName(name);
    setHasEnteredStage(true);

    if (micEnabled) {
      try {
        const stream = await captureUserMedia(videoEnabled);
        localMicStreamRef.current = stream;
        webrtcRef.current?.attachMicStream(stream);
        setIsMicActive(true);
      } catch (err) {
        console.warn('Microphone capture failed:', err);
      }
    }

    if (presentImmediately && room?.mediaMode === 'screen' && room?.hostId === currentUserId) {
      handleToggleScreenShare();
    }
  };

  // Microphone toggle handler
  const handleToggleMic = async () => {
    if (isMicActive) {
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getTracks().forEach((t) => t.stop());
        localMicStreamRef.current = null;
      }
      setIsMicActive(false);
    } else {
      try {
        const stream = await captureUserMedia(false);
        localMicStreamRef.current = stream;
        webrtcRef.current?.attachMicStream(stream);
        setIsMicActive(true);
      } catch (err) {
        console.error('Failed to capture microphone:', err);
      }
    }
  };

  // Screen share toggle handler (Host only)
  const handleToggleScreenShare = async () => {
    if (isSharingScreen) {
      webrtcRef.current?.removeScreenStream();
      setMediaStream(undefined);
      setIsSharingScreen(false);
    } else {
      try {
        const { stream } = await captureDisplayMedia();
        setMediaStream(stream);
        setIsSharingScreen(true);
        webrtcRef.current?.attachScreenStream(stream);

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            handleToggleScreenShare();
          };
        }
      } catch (err) {
        console.warn('Screen share canceled or failed:', err);
      }
    }
  };

  const handleSelectLocalFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setLocalFileUrl(objectUrl);
  };

  const handleVideoRef = useCallback((videoElement: HTMLVideoElement | null) => {
    if (videoElement && synchronizerRef.current) {
      synchronizerRef.current.mount(videoElement);
    }
  }, []);

  if (errorState) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-[var(--destructive)] flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Unable to Join Watchroom</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-6">{errorState}</p>
          <button
            onClick={onLeave}
            className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] flex flex-col items-center justify-center text-[var(--text-secondary)] text-sm">
        <div className="w-8 h-8 border-2 border-[var(--text-tertiary)] border-t-[var(--text-primary)] rounded-full animate-spin mb-3" />
        <span>Loading watchroom...</span>
      </div>
    );
  }

  // Show Google Meet-style Green Room device check before entering the stage
  if (!hasEnteredStage) {
    return (
      <GreenRoom
        roomName={room.name}
        roomId={roomId}
        initialUserName={effectiveUserName}
        mediaMode={room.mediaMode}
        isHost={isHost}
        onJoin={handleGreenRoomJoin}
        onCancel={onLeave}
      />
    );
  }


  return (
    <WatchStage
      roomName={room.name}
      roomId={roomId}
      mediaMode={room.mediaMode}
      isHost={isHost}
      currentUserId={currentUserId}
      currentUserName={effectiveUserName}
      mediaStream={mediaStream}
      localFileUrl={localFileUrl}
      participants={participants}
      isMicActive={isMicActive}
      isSharingScreen={isSharingScreen}
      onToggleMic={handleToggleMic}
      onToggleScreenShare={handleToggleScreenShare}
      onSelectLocalFile={handleSelectLocalFile}
      onLeaveRoom={onLeave}
      videoRefCallback={handleVideoRef}
      unreadChatCount={unreadChatCount}
      childrenChat={
        <ChatSidebar
          roomId={roomId}
          currentUserId={currentUserId}
          currentUserName={effectiveUserName}
          isOpen={true}
          onClose={() => {}}
          onNewMessageReceived={() => setUnreadChatCount((prev) => prev + 1)}
        />
      }
    />
  );
};
