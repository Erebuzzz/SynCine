import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ID } from 'appwrite';
import { Bell } from 'lucide-react';
import {
  databases,
  realtime,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  RoomDocument,
  MAX_PARTICIPANTS,
  RealtimeResponseEvent,
  extractYouTubeId
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
import { FloatingReaction } from './EmojiReactions';
import { SynEmojiId } from './icons/SynEmojiIcons';
import {
  backgroundBlur,
  getStoredBlurRadius,
  setStoredBlurRadius
} from '../lib/background-blur';

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
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [bgBlurRadius, setBgBlurRadius] = useState<number>(() => getStoredBlurRadius());

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

  // Floating reactions state
  const [activeReactions, setActiveReactions] = useState<FloatingReaction[]>([]);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [activeKnocks, setActiveKnocks] = useState<{ senderId: string; guestName: string }[]>([]);
  const [youtubeSyncState, setYoutubeSyncState] = useState<{ currentTime: number; isPlaying: boolean; timestamp: number } | null>(null);
  const [isCameraMirrored, setIsCameraMirrored] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syncine-camera-mirrored') === 'true';
    }
    return false;
  });

  const triggerReactionAnimation = useCallback((emojiId: SynEmojiId, senderName?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const xPercent = 15 + Math.random() * 65;
    const newReaction: FloatingReaction = { id, emojiId, xPercent, senderName };
    setActiveReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2700);
  }, []);

  const playDoorbellChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch {}
  }, []);

  const handleAdmitGuest = async (senderId: string) => {
    setActiveKnocks((prev) => prev.filter((k) => k.senderId !== senderId));
    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SIGNALING,
        ID.unique(),
        {
          roomId,
          senderId: currentUserId,
          receiverId: senderId,
          type: 'knock-admitted',
          payload: '{}'
        }
      );
    } catch (err) {
      console.warn('Failed to admit guest:', err);
    }
  };

  const handleDeclineGuest = async (senderId: string) => {
    setActiveKnocks((prev) => prev.filter((k) => k.senderId !== senderId));
    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SIGNALING,
        ID.unique(),
        {
          roomId,
          senderId: currentUserId,
          receiverId: senderId,
          type: 'knock-declined',
          payload: '{}'
        }
      );
    } catch (err) {
      console.warn('Failed to decline guest:', err);
    }
  };

  const handleYouTubeSyncAction = useCallback((state: { currentTime: number; isPlaying: boolean }) => {
    if (!room || room.hostId !== currentUserId) return;
    const packet: SyncPacket = {
      action: state.isPlaying ? 'play' : 'pause',
      currentTime: state.currentTime,
      originTimestamp: Date.now()
    };
    databases.updateDocument(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, roomId, {
      syncState: JSON.stringify(packet)
    }).catch((err) => {
      console.warn('Failed to sync YouTube state:', err);
    });
  }, [room, currentUserId, roomId]);

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
        const currentCount = typeof doc.participantCount === 'number' ? doc.participantCount : 0;
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

  // Poll live WebRTC and system telemetry only while Settings modal is open
  useEffect(() => {
    if (!hasEnteredStage || !isSettingsOpen) return;

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
  }, [hasEnteredStage, isSettingsOpen]);

  // WebRTC and Synchronizer Setup once user enters through the Green Room
  useEffect(() => {
    if (!hasEnteredStage || !room) return;

    let isMounted = true;

    async function initStage() {
      if (!isMounted || !room) return;

      // Increment participant count when entering stage
      try {
        const freshDoc = await databases.getDocument<RoomDocument>(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.ROOMS,
          roomId
        );
        const currentCount = typeof freshDoc.participantCount === 'number' ? freshDoc.participantCount : 0;
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.ROOMS,
          roomId,
          { participantCount: Math.min(MAX_PARTICIPANTS, currentCount + 1) }
        );
      } catch (err) {
        console.warn('Failed to update participant count on join:', err);
      }

      // Initialize WebRTC Engine
      const engine = new WebRTCEngine({
        client: databases.client,
        databaseId: APPWRITE_DATABASE_ID,
        roomId,
        currentUserId,
        currentUserName: effectiveUserName,
        onConnectionStatusChange: (status) => {
          if (isMounted) {
            setNetworkStatus(status);
          }
        },
        onPeerDiscovered: (peerId, remoteUserName) => {
          setParticipants((prev) => {
            const existingIndex = prev.findIndex((p) => p.id === peerId);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                name: remoteUserName || updated[existingIndex].name
              };
              return updated;
            }
            return [
              ...prev,
              {
                id: peerId,
                name: remoteUserName,
                stream: undefined,
                isMicActive: false,
                isCameraActive: false
              }
            ];
          });
        },
        onRemoteTrackAdded: (peerId, stream, peerName) => {
          // Check if this stream is the screen broadcast
          if (screenStreamIdRef.current && stream.id === screenStreamIdRef.current) {
            setRemoteScreenStream(stream);
            return;
          }

          setParticipants((prev) => {
            const existingIndex = prev.findIndex((p) => p.id === peerId);
            const hasAudio = stream.getAudioTracks().some((t) => t.enabled);
            const hasVideo = stream.getVideoTracks().some((t) => t.enabled);
            const displayName =
              peerName ||
              (existingIndex >= 0 ? prev[existingIndex].name : undefined) ||
              engine.getPeerName(peerId) ||
              `Participant ${peerId.slice(-4)}`;

            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                name: displayName,
                stream,
                isMicActive: hasAudio,
                isCameraActive: hasVideo
              };
              return updated;
            }
            return [
              ...prev,
              {
                id: peerId,
                name: displayName,
                stream,
                isMicActive: hasAudio,
                isCameraActive: hasVideo
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
        },
        onHostCommandReceived: (command, targetId) => {
          if (command === 'mute-all' || (command === 'mute-user' && targetId === currentUserId)) {
            if (isMicActive) {
              handleToggleMic();
            }
          } else if (command === 'kick-user' && targetId === currentUserId) {
            alert('You have been removed from the watchroom by the host.');
            onLeave();
          } else if (command === 'end-room') {
            alert('The host has ended this watchroom session.');
            onLeave();
          }
        },
        onEmojiReactionReceived: (emojiId, senderName) => {
          triggerReactionAnimation(emojiId as SynEmojiId, senderName);
        },
        onCameraMirrorChanged: (peerId, isMirrored) => {
          setParticipants((prev) =>
            prev.map((p) => (p.id === peerId ? { ...p, isMirrored } : p))
          );
        }
      });

      webrtcRef.current = engine;

      // Attach local mic and camera tracks if captured
      if (localUserMediaRef.current) {
        if (isMicActive) {
          engine.attachMicStream(localUserMediaRef.current);
        }
        if (isCameraActive && localUserMediaRef.current.getVideoTracks().length > 0) {
          if (backgroundBlur.isEnabled()) {
            try {
              const processed = await backgroundBlur.processStream(localUserMediaRef.current);
              engine.attachCameraStream(processed);
            } catch {
              engine.attachCameraStream(localUserMediaRef.current);
            }
          } else {
            engine.attachCameraStream(localUserMediaRef.current);
          }
        }
      }

      // Announce presence to entire room so existing peers connect
      await engine.announceJoin(effectiveUserName);

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

    const handleBeforeUnload = () => {
      webrtcRef.current?.announceLeave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Subscribe to Realtime room updates
    const roomChannel = `databases.${APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.ROOMS}.documents.${roomId}`;
    const unsubscribeRoom = realtime.subscribe<RoomDocument>(roomChannel, (event: RealtimeResponseEvent<RoomDocument>) => {
      const updatedDoc = event.payload;
      if (updatedDoc) {
        setRoom(updatedDoc);

        if (updatedDoc.syncState) {
          try {
            const packet: SyncPacket = JSON.parse(updatedDoc.syncState);
            if (synchronizerRef.current) {
              synchronizerRef.current.applyRemoteUpdate(packet);
            }
            if (packet.originTimestamp) {
              setYoutubeSyncState({
                currentTime: packet.currentTime,
                isPlaying: packet.action === 'play',
                timestamp: packet.originTimestamp
              });
            }
          } catch (err) {
            console.warn('Failed to parse syncState packet:', err);
          }
        }
      }
    });

    // Subscribe to Signaling channel for doorbell knocks (Host admission)
    const signalingChannel = `databases.${APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.SIGNALING}.documents`;
    const unsubscribeSignaling = realtime.subscribe(signalingChannel, (event: any) => {
      const payload = event?.payload;
      if (payload?.roomId === roomId && payload?.receiverId === currentUserId && payload?.type === 'knock') {
        try {
          const data = JSON.parse(payload.payload);
          playDoorbellChime();
          setActiveKnocks((prev) => {
            if (prev.some((k) => k.senderId === payload.senderId)) return prev;
            return [...prev, { senderId: payload.senderId, guestName: data.guestName || 'Guest' }];
          });
        } catch {}
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribeRoom();
      unsubscribeSignaling();

      if (room) {
        databases.getDocument<RoomDocument>(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, roomId)
          .then((d) => {
            const prev = typeof d.participantCount === 'number' ? d.participantCount : 1;
            const newCount = Math.max(0, prev - 1);
            return databases.updateDocument(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, roomId, {
              participantCount: newCount
            });
          })
          .catch(() => {});
      }

      if (webrtcRef.current) {
        webrtcRef.current.announceLeave();
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
    presentImmediately: boolean,
    blurRadius?: number
  ) => {
    setEffectiveUserName(name);
    if (typeof blurRadius === 'number') {
      setBgBlurRadius(blurRadius);
      setStoredBlurRadius(blurRadius);
      backgroundBlur.setBlurRadius(blurRadius);
    }

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

        if (videoEnabled && backgroundBlur.isEnabled()) {
          try {
            const processed = await backgroundBlur.processStream(stream);
            setLocalUserMediaStream(processed);
          } catch {
            setLocalUserMediaStream(stream);
          }
        } else {
          setLocalUserMediaStream(stream);
        }

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

  const handleSetBlurRadius = async (radius: number) => {
    setBgBlurRadius(radius);
    setStoredBlurRadius(radius);
    backgroundBlur.setBlurRadius(radius);

    if (localUserMediaRef.current && isCameraActive) {
      if (radius > 0) {
        try {
          const processed = await backgroundBlur.processStream(localUserMediaRef.current);
          webrtcRef.current?.attachCameraStream(processed);
          setLocalUserMediaStream(processed);
        } catch (err) {
          console.warn('Failed to update background blur in stage:', err);
        }
      } else {
        webrtcRef.current?.attachCameraStream(localUserMediaRef.current);
        setLocalUserMediaStream(new MediaStream(localUserMediaRef.current.getTracks()));
      }
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
            localUserMediaRef.current = newStream;
            setLocalUserMediaStream(new MediaStream(newStream.getTracks()));
          }
        }
        if (stream) {
          if (backgroundBlur.isEnabled()) {
            try {
              const processed = await backgroundBlur.processStream(stream);
              webrtcRef.current?.attachCameraStream(processed);
              setLocalUserMediaStream(processed);
            } catch {
              webrtcRef.current?.attachCameraStream(stream);
              setLocalUserMediaStream(new MediaStream(stream.getTracks()));
            }
          } else {
            webrtcRef.current?.attachCameraStream(stream);
            setLocalUserMediaStream(new MediaStream(stream.getTracks()));
          }
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

  const handleToggleRoomLock = () => {
    setIsRoomLocked((prev) => !prev);
  };

  const handleHostMuteAll = () => {
    webrtcRef.current?.broadcastHostCommand('mute-all');
  };

  const handleHostMuteParticipant = (peerId: string) => {
    webrtcRef.current?.broadcastHostCommand('mute-user', peerId);
  };

  const handleHostKickParticipant = (peerId: string) => {
    webrtcRef.current?.broadcastHostCommand('kick-user', peerId);
    setParticipants((prev) => prev.filter((p) => p.id !== peerId));
  };

  const handleHostEndSession = () => {
    webrtcRef.current?.broadcastHostCommand('end-room');
    onLeave();
  };

  const handleSendEmojiReaction = (emojiId: SynEmojiId) => {
    triggerReactionAnimation(emojiId, effectiveUserName);
    webrtcRef.current?.broadcastEmojiReaction(emojiId, effectiveUserName);
  };

  const handleToggleCameraMirror = (mirrored: boolean) => {
    setIsCameraMirrored(mirrored);
    localStorage.setItem('syncine-camera-mirrored', mirrored ? 'true' : 'false');
    webrtcRef.current?.broadcastCameraMirror(mirrored);
  };

  const displayedParticipants: Participant[] = useMemo(() => {
    const list: Participant[] = [];
    // Self participant tile
    list.push({
      id: currentUserId,
      name: `${effectiveUserName}`,
      stream: localUserMediaStream || undefined,
      isSelf: true,
      isMicActive,
      isCameraActive,
      isMirrored: isCameraMirrored
    });
    // Remote participants
    participants.forEach((p) => {
      list.push({
        ...p,
        isSelf: false
      });
    });
    return list;
  }, [currentUserId, effectiveUserName, localUserMediaStream, isMicActive, isCameraActive, isCameraMirrored, participants]);

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
        currentUserId={currentUserId}
        mediaMode={room.mediaMode}
        isHost={isHost}
        onJoin={handleGreenRoomJoin}
        onCancel={onLeave}
      />
    );
  }

  const effectiveMediaStream = isHost ? mediaStream : remoteScreenStream;

  return (
    <>
      {/* Knocking Guest Toast Banner (Host only) */}
      {isHost && activeKnocks.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none select-none">
          {activeKnocks.map((k) => (
            <div
              key={k.senderId}
              className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/90 dark:bg-[#151518]/95 backdrop-blur-2xl border border-[var(--accent)]/50 shadow-2xl text-xs text-white animate-enter-smooth"
            >
              <Bell size={16} className="text-[var(--accent)] animate-bounce shrink-0" />
              <span>
                <strong className="text-[var(--accent)]">{k.guestName}</strong> is knocking to enter the room
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => handleAdmitGuest(k.senderId)}
                  className="px-3 py-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-bold rounded-lg transition cursor-pointer"
                >
                  Admit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeclineGuest(k.senderId)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition cursor-pointer"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {networkStatus !== 'connected' && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/90 text-black font-bold text-xs shadow-2xl backdrop-blur-md animate-enter-smooth select-none">
          <div className="w-2 h-2 rounded-full bg-black animate-ping" />
          <span>
            {networkStatus === 'offline'
              ? 'Internet connection lost. Waiting to reconnect...'
              : 'Connection interrupted. Reconnecting to watchroom...'}
          </span>
        </div>
      )}

      <WatchStage
        roomName={room.name}
        roomId={roomId}
        mediaMode={room.mediaMode}
        youtubeVideoId={room.youtubeVideoId || (room.youtubeUrl ? (extractYouTubeId(room.youtubeUrl) ?? undefined) : undefined)}
        youtubeSyncState={youtubeSyncState}
        onYouTubeSyncAction={handleYouTubeSyncAction}
        isHost={isHost}
        currentUserId={currentUserId}
        currentUserName={effectiveUserName}
        mediaStream={effectiveMediaStream}
      localFileUrl={localFileUrl}
      participants={displayedParticipants}
      isMicActive={isMicActive}
      isCameraActive={isCameraActive}
      isCameraMirrored={isCameraMirrored}
      onToggleCameraMirror={handleToggleCameraMirror}
      bgBlurRadius={bgBlurRadius}
      onSetBlurRadius={handleSetBlurRadius}
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
      isRoomLocked={isRoomLocked}
      onToggleRoomLock={handleToggleRoomLock}
      onMuteAllViewers={handleHostMuteAll}
      onMuteParticipant={handleHostMuteParticipant}
      onKickParticipant={handleHostKickParticipant}
      onEndSessionForAll={handleHostEndSession}
      activeReactions={activeReactions}
      onSendEmojiReaction={handleSendEmojiReaction}
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
          isCameraMirrored={isCameraMirrored}
          onToggleCameraMirror={handleToggleCameraMirror}
          bgBlurRadius={bgBlurRadius}
          onSetBlurRadius={handleSetBlurRadius}
        />
      }
    />
  </>
);
};
