import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import {
  captureDisplayMedia,
  captureUserMedia,
  getAudioInputDevices,
  getAudioOutputDevices,
  getVideoInputDevices,
  applyTrackResolution,
  setElementAudioOutput,
  RESOLUTION_PRESETS,
  VideoResolution,
  MediaDeviceInfoItem
} from '../lib/media-capture';
import {
  SystemLoadMonitor,
  collectTelemetry,
  TelemetryStats,
  LatencyDataPoint
} from '../lib/diagnostics';
import { WatchStage, Participant } from './WatchStage';
import { ChatSidebar } from './ChatSidebar';
import { GreenRoom } from './GreenRoom';
import { SettingsModal } from './SettingsModal';

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
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | undefined>(undefined);
  const [localFileUrl, setLocalFileUrl] = useState<string | undefined>(undefined);
  const [localUserMediaStream, setLocalUserMediaStream] = useState<MediaStream | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [errorState, setErrorState] = useState<string | null>(null);

  // In-room Settings & Telemetry state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfoItem[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfoItem[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfoItem[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState<string>('');
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [selectedResolution, setSelectedResolution] = useState<VideoResolution>('720p');
  const [isNoiseSuppressionEnabled, setIsNoiseSuppressionEnabled] = useState(true);

  const [telemetry, setTelemetry] = useState<TelemetryStats>({
    rtt: 28,
    jitter: 3,
    packetLoss: 0,
    downstreamKbps: 0,
    upstreamKbps: 0,
    systemLoad: 12,
    cpuCores: typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4,
    memoryUsedMb: null,
    memoryLimitMb: null,
    status: 'healthy',
    verdict: 'Optimal Connection & Performance',
    recommendation: 'Your stream pipeline and local system are running smoothly.'
  });
  const [latencyHistory, setLatencyHistory] = useState<LatencyDataPoint[]>([]);
  const systemMonitorRef = useRef<SystemLoadMonitor | null>(null);

  // Google Meet Green Room preview state
  const [hasEnteredStage, setHasEnteredStage] = useState(false);
  const [effectiveUserName, setEffectiveUserName] = useState(currentUserName);

  const webrtcRef = useRef<WebRTCEngine | null>(null);
  const synchronizerRef = useRef<PlaybackSynchronizer | null>(null);
  const localUserMediaRef = useRef<MediaStream | null>(null);
  const screenStreamIdRef = useRef<string | null>(null);
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

  // Enumerate Audio/Video Devices and initialize CPU/system load monitor
  useEffect(() => {
    let isMounted = true;
    async function loadDevices() {
      try {
        const [audIn, audOut, vidIn] = await Promise.all([
          getAudioInputDevices(),
          getAudioOutputDevices(),
          getVideoInputDevices()
        ]);
        if (!isMounted) return;
        setAudioInputDevices(audIn);
        setAudioOutputDevices(audOut);
        setVideoInputDevices(vidIn);

        if (audIn.length > 0) setSelectedAudioDeviceId((prev) => prev || audIn[0].deviceId);
        if (audOut.length > 0) setSelectedAudioOutputDeviceId((prev) => prev || audOut[0].deviceId);
        if (vidIn.length > 0) setSelectedVideoDeviceId((prev) => prev || vidIn[0].deviceId);
      } catch (err) {
        console.warn('Device enumeration failed:', err);
      }
    }
    loadDevices();

    const monitor = new SystemLoadMonitor();
    monitor.start();
    systemMonitorRef.current = monitor;

    return () => {
      isMounted = false;
      monitor.stop();
      systemMonitorRef.current = null;
    };
  }, []);

  // Poll live WebRTC and system telemetry every 1.5 seconds once on stage
  useEffect(() => {
    if (!hasEnteredStage) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const pcs = webrtcRef.current?.getPeerConnections();
        const report = await collectTelemetry(pcs, systemMonitorRef.current || undefined);
        if (isMounted) {
          setTelemetry(report);
          setLatencyHistory((prev) => {
            const next = [
              ...prev,
              { timestamp: Date.now(), rtt: report.rtt, systemLoad: report.systemLoad }
            ];
            if (next.length > 30) next.shift();
            return next;
          });
        }
      } catch (err) {
        console.warn('Telemetry polling error:', err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [hasEnteredStage]);

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
          // Check if this stream is the screen broadcast
          if (screenStreamIdRef.current && stream.id === screenStreamIdRef.current) {
            setRemoteScreenStream(stream);
            return;
          }

          setParticipants((prev) => {
            const existingIndex = prev.findIndex((p) => p.id === peerId);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], stream };
              return updated;
            }
            return [
              ...prev,
              {
                id: peerId,
                name: `Viewer ${peerId.slice(-4)}`,
                stream,
                isMicActive: stream.getAudioTracks().some((t) => t.enabled),
                isCameraActive: stream.getVideoTracks().some((t) => t.enabled)
              }
            ];
          });
        },
        onScreenShareChanged: (_peerId, streamId, active) => {
          if (active && streamId) {
            screenStreamIdRef.current = streamId;
          } else {
            screenStreamIdRef.current = null;
            setRemoteScreenStream(undefined);
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

      // Attach local mic and camera tracks if captured
      if (localUserMediaRef.current) {
        if (isMicActive) {
          engine.attachMicStream(localUserMediaRef.current);
        }
        if (isCameraActive && localUserMediaRef.current.getVideoTracks().length > 0) {
          engine.attachCameraStream(localUserMediaRef.current);
        }
      }

      // Announce presence to entire room so existing peers connect
      await engine.announceJoin(effectiveUserName);

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
      if (localUserMediaRef.current) {
        localUserMediaRef.current.getTracks().forEach((t) => t.stop());
        localUserMediaRef.current = null;
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

    if (micEnabled || videoEnabled) {
      try {
        const stream = await captureUserMedia(videoEnabled);
        stream.getAudioTracks().forEach((t) => {
          t.enabled = micEnabled;
        });
        stream.getVideoTracks().forEach((t) => {
          t.enabled = videoEnabled;
        });
        localUserMediaRef.current = stream;
        setLocalUserMediaStream(stream);
        setIsMicActive(micEnabled);
        setIsCameraActive(videoEnabled);
      } catch (err) {
        console.warn('Media capture failed in green room join:', err);
      }
    }

    setHasEnteredStage(true);

    if (presentImmediately && room?.mediaMode === 'screen' && room?.hostId === currentUserId) {
      setTimeout(() => {
        handleToggleScreenShare();
      }, 500);
    }
  };

  // Microphone toggle handler
  const handleToggleMic = async () => {
    if (isMicActive) {
      if (localUserMediaRef.current) {
        localUserMediaRef.current.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      setIsMicActive(false);
    } else {
      try {
        let stream = localUserMediaRef.current;
        if (!stream || stream.getAudioTracks().length === 0) {
          stream = await captureUserMedia(isCameraActive);
          localUserMediaRef.current = stream;
          setLocalUserMediaStream(stream);
        } else {
          stream.getAudioTracks().forEach((t) => {
            t.enabled = true;
          });
        }
        webrtcRef.current?.attachMicStream(stream);
        setIsMicActive(true);
      } catch (err) {
        console.error('Failed to enable microphone:', err);
      }
    }
  };

  // Camera toggle handler
  const handleToggleCamera = async () => {
    if (isCameraActive) {
      if (localUserMediaRef.current) {
        localUserMediaRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      webrtcRef.current?.removeCameraStream();
      setIsCameraActive(false);
    } else {
      try {
        let stream = localUserMediaRef.current;
        const existingVideoTrack = stream?.getVideoTracks()[0];
        if (existingVideoTrack && existingVideoTrack.readyState === 'live') {
          existingVideoTrack.enabled = true;
        } else {
          const newStream = await captureUserMedia(true);
          const newVideoTrack = newStream.getVideoTracks()[0];
          if (stream) {
            stream.getVideoTracks().forEach((t) => stream!.removeTrack(t));
            if (newVideoTrack) stream.addTrack(newVideoTrack);
          } else {
            stream = newStream;
            localUserMediaRef.current = stream;
            setLocalUserMediaStream(stream);
          }
        }
        if (stream) {
          webrtcRef.current?.attachCameraStream(stream);
        }
        setIsCameraActive(true);
      } catch (err) {
        console.error('Failed to enable camera:', err);
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

  // Settings Change Handlers
  const handleSelectAudioInputDevice = async (deviceId: string) => {
    setSelectedAudioDeviceId(deviceId);
    if (isMicActive) {
      try {
        const newStream = await captureUserMedia({
          withVideo: isCameraActive,
          audioDeviceId: deviceId,
          videoDeviceId: selectedVideoDeviceId,
          resolution: selectedResolution,
          noiseSuppression: isNoiseSuppressionEnabled
        });
        localUserMediaRef.current?.getAudioTracks().forEach((t) => t.stop());
        const audioTrack = newStream.getAudioTracks()[0];
        if (audioTrack && localUserMediaRef.current) {
          localUserMediaRef.current.addTrack(audioTrack);
          await webrtcRef.current?.replaceTracks(audioTrack, undefined);
          setLocalUserMediaStream(new MediaStream(localUserMediaRef.current.getTracks()));
        }
      } catch (err) {
        console.warn('Failed to switch audio input device:', err);
      }
    }
  };

  const handleSelectAudioOutputDevice = async (deviceId: string) => {
    setSelectedAudioOutputDeviceId(deviceId);
    document.querySelectorAll('video, audio').forEach((el) => {
      setElementAudioOutput(el as HTMLMediaElement, deviceId).catch(() => {});
    });
  };

  const handleSelectVideoInputDevice = async (deviceId: string) => {
    setSelectedVideoDeviceId(deviceId);
    if (isCameraActive) {
      try {
        const newStream = await captureUserMedia({
          withVideo: true,
          audioDeviceId: selectedAudioDeviceId,
          videoDeviceId: deviceId,
          resolution: selectedResolution,
          noiseSuppression: isNoiseSuppressionEnabled
        });
        localUserMediaRef.current?.getVideoTracks().forEach((t) => t.stop());
        const videoTrack = newStream.getVideoTracks()[0];
        if (videoTrack && localUserMediaRef.current) {
          localUserMediaRef.current.addTrack(videoTrack);
          await webrtcRef.current?.replaceTracks(undefined, videoTrack);
          setLocalUserMediaStream(new MediaStream(localUserMediaRef.current.getTracks()));
        }
      } catch (err) {
        console.warn('Failed to switch video input device:', err);
      }
    }
  };

  const handleSelectResolution = async (resolution: VideoResolution) => {
    setSelectedResolution(resolution);
    const preset = RESOLUTION_PRESETS[resolution];
    const videoTrack = localUserMediaRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      await applyTrackResolution(videoTrack, resolution);
    }
    await webrtcRef.current?.updateVideoEncodings(preset.maxBitrate);
  };

  const handleToggleNoiseSuppression = async (enabled: boolean) => {
    setIsNoiseSuppressionEnabled(enabled);
    const audioTrack = localUserMediaRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      await audioTrack
        .applyConstraints({
          noiseSuppression: enabled,
          echoCancellation: enabled
        })
        .catch(console.warn);
    }
  };

  const handleVideoRef = useCallback((videoElement: HTMLVideoElement | null) => {
    if (videoElement && synchronizerRef.current) {
      synchronizerRef.current.mount(videoElement);
    }
  }, []);

  const displayedParticipants: Participant[] = useMemo(() => {
    const list: Participant[] = [];
    // Self participant tile
    list.push({
      id: currentUserId,
      name: `${effectiveUserName}`,
      stream: localUserMediaStream || undefined,
      isSelf: true,
      isMicActive,
      isCameraActive
    });
    // Remote participants
    participants.forEach((p) => {
      list.push({
        ...p,
        isSelf: false
      });
    });
    return list;
  }, [currentUserId, effectiveUserName, localUserMediaStream, isMicActive, isCameraActive, participants]);

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

  const effectiveMediaStream = isHost ? mediaStream : remoteScreenStream;

  return (
    <WatchStage
      roomName={room.name}
      roomId={roomId}
      mediaMode={room.mediaMode}
      isHost={isHost}
      currentUserId={currentUserId}
      currentUserName={effectiveUserName}
      mediaStream={effectiveMediaStream}
      localFileUrl={localFileUrl}
      participants={displayedParticipants}
      isMicActive={isMicActive}
      isCameraActive={isCameraActive}
      isSharingScreen={isSharingScreen}
      onToggleMic={handleToggleMic}
      onToggleCamera={handleToggleCamera}
      onToggleScreenShare={handleToggleScreenShare}
      onSelectLocalFile={handleSelectLocalFile}
      onLeaveRoom={onLeave}
      videoRefCallback={handleVideoRef}
      unreadChatCount={unreadChatCount}
      isChatOpen={isChatOpen}
      onToggleChat={() => {
        setIsChatOpen((prev) => !prev);
        if (!isChatOpen) {
          setUnreadChatCount(0);
        }
      }}
      onCloseChat={() => setIsChatOpen(false)}
      onOpenSettings={() => setIsSettingsOpen(true)}
      childrenChat={
        <ChatSidebar
          roomId={roomId}
          currentUserId={currentUserId}
          currentUserName={effectiveUserName}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onNewMessageReceived={() => {
            if (!isChatOpen) {
              setUnreadChatCount((prev) => prev + 1);
            }
          }}
        />
      }
      childrenSettings={
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
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
          previewStream={localUserMediaStream}
          telemetry={telemetry}
          latencyHistory={latencyHistory}
        />
      }
    />
  );
};
