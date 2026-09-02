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
});
