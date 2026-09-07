import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCEngine } from '../src/lib/webrtc';

const mockCreateDocument = vi.fn().mockResolvedValue({ $id: 'doc-123' });
const mockSubscribe = vi.fn().mockReturnValue(() => {});

vi.mock('appwrite', () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      setEndpoint: vi.fn().mockReturnThis(),
      setProject: vi.fn().mockReturnThis(),
      subscribe: mockSubscribe
    })),
    Databases: vi.fn().mockImplementation(() => ({
      createDocument: mockCreateDocument
    })),
    ID: {
      unique: vi.fn().mockReturnValue('mock-unique-id')
    },
    Permission: {
      read: vi.fn().mockReturnValue('read-perm'),
      write: vi.fn().mockReturnValue('write-perm')
    },
    Role: {
      user: vi.fn((u) => `user:${u}`),
      any: vi.fn(() => 'any'),
      users: vi.fn(() => 'users')
    }
  };
});

describe('WebRTCEngine Test Suite', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      subscribe: mockSubscribe
    };

    // Mock global RTCPeerConnection
    (global as any).RTCPeerConnection = vi.fn().mockImplementation(() => ({
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp-answer' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      addTrack: vi.fn(),
      addTransceiver: vi.fn().mockImplementation((trackOrKind: any) => ({
        sender: {
          track: typeof trackOrKind === 'string' ? null : trackOrKind,
          replaceTrack: vi.fn().mockResolvedValue(undefined)
        },
        receiver: {
          track: null
        },
        setCodecPreferences: vi.fn()
      })),
      getSenders: vi.fn().mockReturnValue([]),
      getTransceivers: vi.fn().mockReturnValue([]),
      close: vi.fn(),
      signalingState: 'stable',
      iceConnectionState: 'new',
      connectionState: 'new',
      onicecandidate: null,
      ontrack: null,
      onconnectionstatechange: null,
      oniceconnectionstatechange: null,
    }));

    (global as any).RTCRtpSender = {
      getCapabilities: vi.fn().mockReturnValue({
        codecs: [
          { mimeType: 'video/H264' },
          { mimeType: 'video/VP8' },
          { mimeType: 'video/VP9' }
        ]
      })
    };

    (global as any).RTCSessionDescription = vi.fn().mockImplementation((init) => init);
    (global as any).RTCIceCandidate = vi.fn().mockImplementation((init) => init);
  });

  it('subscribes to Appwrite signaling channel on instantiation', () => {
    const engine = new WebRTCEngine({
      client: mockClient,
      databaseId: 'syncine_db',
      roomId: 'room-1',
      currentUserId: 'user-self',
      onRemoteTrackAdded: vi.fn(),
      onPeerDisconnected: vi.fn()
    });

    expect(mockSubscribe).toHaveBeenCalledWith(
      'databases.syncine_db.collections.signaling.documents',
      expect.any(Function)
    );
    expect(engine).toBeDefined();
  });

  it('initiates connection by creating offer and sending signaling document', async () => {
    const engine = new WebRTCEngine({
      client: mockClient,
      databaseId: 'syncine_db',
      roomId: 'room-1',
      currentUserId: 'user-self',
      onRemoteTrackAdded: vi.fn(),
      onPeerDisconnected: vi.fn()
    });

    await engine.initiateConnection('user-peer');

    expect(global.RTCPeerConnection).toHaveBeenCalled();
    const pcInstance = (global.RTCPeerConnection as any).mock.results[0].value;
    expect(pcInstance.createOffer).toHaveBeenCalledWith();
    expect(mockCreateDocument).toHaveBeenCalledWith(
      'syncine_db',
      'signaling',
      'mock-unique-id',
      expect.objectContaining({
        roomId: 'room-1',
        senderId: 'user-self',
        receiverId: 'user-peer',
        type: 'offer'
      }),
      expect.any(Array)
    );
  });

  it('updates transceiver on attachCameraStream and removeCameraStream', async () => {
    const engine = new WebRTCEngine({
      client: mockClient,
      databaseId: 'syncine_db',
      roomId: 'room-1',
      currentUserId: 'user-self',
      onRemoteTrackAdded: vi.fn(),
      onPeerDisconnected: vi.fn()
    });

    await engine.initiateConnection('user-peer');
    const pcInstance = (global.RTCPeerConnection as any).mock.results[0].value;

    const mockVideoTrack = { kind: 'video', id: 'video-track-1' };
    const mockCameraStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      getAudioTracks: vi.fn().mockReturnValue([]),
      getTracks: vi.fn().mockReturnValue([mockVideoTrack])
    } as any;

    engine.attachCameraStream(mockCameraStream);
    expect(pcInstance.addTrack).not.toHaveBeenCalled();
    engine.removeCameraStream();

    expect(mockCameraStream.getVideoTracks).toHaveBeenCalled();
  });

  it('supports onRemoteScreenStream callback', () => {
    const onRemoteScreenStream = vi.fn();
    const engine = new WebRTCEngine({
      client: mockClient,
      databaseId: 'syncine_db',
      roomId: 'room-1',
      currentUserId: 'user-self',
      onRemoteScreenStream,
      onRemoteTrackAdded: vi.fn(),
      onPeerDisconnected: vi.fn()
    });

    expect(engine).toBeDefined();
    expect(onRemoteScreenStream).not.toHaveBeenCalled();
  });

  it('prioritizes VP8 codec on video transceivers', async () => {
    const mockSetCodecPreferences = vi.fn();
    (global as any).RTCPeerConnection = vi.fn().mockImplementation(() => ({
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      addTransceiver: vi.fn().mockImplementation(() => ({
        sender: { track: null, replaceTrack: vi.fn().mockResolvedValue(undefined) },
        receiver: { track: null },
        setCodecPreferences: mockSetCodecPreferences
      })),
      getSenders: vi.fn().mockReturnValue([]),
      getTransceivers: vi.fn().mockReturnValue([]),
      close: vi.fn()
    }));

    const engine = new WebRTCEngine({
      client: mockClient,
      databaseId: 'syncine_db',
      roomId: 'room-1',
      currentUserId: 'user-self',
      onRemoteTrackAdded: vi.fn(),
      onPeerDisconnected: vi.fn()
    });

    await engine.initiateConnection('peer-1');

    expect(mockSetCodecPreferences).toHaveBeenCalledWith([
      { mimeType: 'video/VP8' },
      { mimeType: 'video/H264' },
      { mimeType: 'video/VP9' }
    ]);
  });

  it('pre-allocates 4 dedicated transceivers for audio, camera, screen share, and broadcast audio', async () => {
    const mockAddTransceiver = vi.fn().mockImplementation((_kind: any) => ({
      sender: { track: null, replaceTrack: vi.fn().mockResolvedValue(undefined) },
      receiver: { track: null },
      setCodecPreferences: vi.fn()
    }));

    (global as any).RTCPeerConnection = vi.fn().mockImplementation(() => ({
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      addTransceiver: mockAddTransceiver,
      getSenders: vi.fn().mockReturnValue([]),
      getTransceivers: vi.fn().mockReturnValue([]),
      close: vi.fn()
    }));

    const engine = new WebRTCEngine({
      client: mockClient,
      databaseId: 'syncine_db',
      roomId: 'room-1',
      currentUserId: 'user-self',
      onRemoteTrackAdded: vi.fn(),
      onPeerDisconnected: vi.fn()
    });

    await engine.initiateConnection('peer-2');

    // Verify exactly 4 transceivers were added: audio (sendrecv), camera (sendrecv), screen share (recvonly), and screen audio (recvonly)
    expect(mockAddTransceiver).toHaveBeenCalledTimes(4);
    expect(mockAddTransceiver).toHaveBeenNthCalledWith(1, 'audio', expect.objectContaining({ direction: 'sendrecv' }));
    expect(mockAddTransceiver).toHaveBeenNthCalledWith(2, 'video', expect.objectContaining({ direction: 'sendrecv' }));
    expect(mockAddTransceiver).toHaveBeenNthCalledWith(3, 'video', expect.objectContaining({ direction: 'recvonly' }));
    expect(mockAddTransceiver).toHaveBeenNthCalledWith(4, 'audio', expect.objectContaining({ direction: 'recvonly' }));
  });

  it('broadcasts camera and mic state updates via signaling documents', async () => {
    const engine = new WebRTCEngine({
      client: mockClient,
      databaseId: 'syncine_db',
      roomId: 'room-1',
      currentUserId: 'user-self',
      onRemoteTrackAdded: vi.fn(),
      onPeerDisconnected: vi.fn()
    });

    await engine.broadcastCameraState(true);
    expect(mockCreateDocument).toHaveBeenCalledWith(
      'syncine_db',
      'signaling',
      'mock-unique-id',
      expect.objectContaining({
        roomId: 'room-1',
        senderId: 'user-self',
        receiverId: 'all',
        type: 'candidate',
        payload: JSON.stringify({
          action: 'camera-state-changed',
          isCameraActive: true,
          senderId: 'user-self'
        })
      }),
      expect.any(Array)
    );

    await engine.broadcastMicState(false);
    expect(mockCreateDocument).toHaveBeenCalledWith(
      'syncine_db',
      'signaling',
      'mock-unique-id',
      expect.objectContaining({
        roomId: 'room-1',
        senderId: 'user-self',
        receiverId: 'all',
        type: 'candidate',
        payload: JSON.stringify({
          action: 'mic-state-changed',
          isMicActive: false,
          senderId: 'user-self'
        })
      }),
      expect.any(Array)
    );
  });
});
