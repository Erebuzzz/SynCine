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

  const webrtcRef = useRef<WebRTCEngine | null>(null);
  const synchronizerRef = useRef<PlaybackSynchronizer | null>(null);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const isHost = room?.hostId === currentUserId;

  // Initialize WebRTC and Synchronizer
  useEffect(() => {
    let isMounted = true;

    async function initRoom() {
      try {
        const doc = await databases.getDocument<RoomDocument>(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.ROOMS,
          roomId
        );

        if (!isMounted) return;

        // Check participant capacity
        const currentCount = doc.participantCount || 1;
        if (currentCount >= MAX_PARTICIPANTS && doc.hostId !== currentUserId) {
          setErrorState(`Room is at full capacity (Maximum ${MAX_PARTICIPANTS} users).`);
          return;
        }

        setRoom(doc);

        // If joining as non-host, increment participant count
        if (doc.hostId !== currentUserId) {
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
              return [...prev, { id: peerId, name: `User ${peerId.slice(-4)}`, stream }];
            });

            // If remote stream has screen video, display it on stage for viewers
            if (stream.getVideoTracks().length > 0 && doc.hostId !== currentUserId) {
              setMediaStream(stream);
            }
          },
          onPeerDisconnected: (peerId) => {
            setParticipants((prev) => prev.filter((p) => p.id !== peerId));
          },
          onPeerConnected: (peerId) => {
            console.log(`Connected with peer: ${peerId}`);
          }
        });

        webrtcRef.current = engine;

        // If not host, initiate WebRTC handshake with host
        if (doc.hostId !== currentUserId) {
          await engine.initiateConnection(doc.hostId);
        }

        // Initialize Playback Synchronizer
        const sync = new PlaybackSynchronizer(
          databases,
          APPWRITE_DATABASE_ID,
          roomId,
          doc.hostId === currentUserId
        );
        synchronizerRef.current = sync;

      } catch (err: any) {
        if (isMounted) {
          setErrorState(err?.message || 'Failed to load room details.');
        }
      }
    }

    initRoom();

    // Subscribe to Room document changes (for syncState and capacity)
    const roomChannel = `databases.${APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.ROOMS}.documents.${roomId}`;
    const unsubscribeRoom = realtime.subscribe<RoomDocument>(roomChannel, (event: RealtimeResponseEvent<RoomDocument>) => {
      const updatedDoc = event.payload;
      if (updatedDoc) {
        setRoom(updatedDoc);

        // Apply synchronized playback state in local_file mode
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

      // Decrement participant count if leaving
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

      // Cleanup WebRTC & media
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
  }, [roomId, currentUserId]);

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

        // Listen for user stopping screen share via browser floating bar
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

  // Local file selector handler
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
      <div className="h-screen w-screen bg-[#080C14] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Unable to Join Room</h2>
          <p className="text-slate-400 text-xs leading-relaxed mb-6">{errorState}</p>
          <button
            onClick={onLeave}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="h-screen w-screen bg-[#080C14] flex flex-col items-center justify-center text-slate-400 text-sm">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Connecting to watch party stage...</span>
      </div>
    );
  }

  return (
    <WatchStage
      roomName={room.name}
      roomId={roomId}
      mediaMode={room.mediaMode}
      isHost={isHost}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
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
          currentUserName={currentUserName}
          isOpen={true}
          onClose={() => {}}
          onNewMessageReceived={() => setUnreadChatCount((prev) => prev + 1)}
        />
      }
    />
  );
};
