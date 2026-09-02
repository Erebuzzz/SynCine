import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaybackSynchronizer, SyncPacket } from '../src/lib/sync-engine';

describe('PlaybackSynchronizer Test Suite', () => {
  let mockDb: any;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockDb = {
      getDocument: vi.fn().mockResolvedValue({ $id: 'room-123' }),
      updateDocument: vi.fn().mockResolvedValue({ $id: 'room-123' }),
    };

    mockVideo = document.createElement('video');
    Object.defineProperty(mockVideo, 'currentTime', {
      value: 10,
      writable: true,
      configurable: true
    });
    Object.defineProperty(mockVideo, 'paused', {
      value: true,
      writable: true,
      configurable: true
    });
    mockVideo.play = vi.fn().mockResolvedValue(undefined);
    mockVideo.pause = vi.fn();
  });

  it('measures round trip latency benchmark on initialization', async () => {
    const sync = new PlaybackSynchronizer(mockDb, 'syncine_db', 'room-123', false);
    const latency = await sync.benchmarkRoundTrip();

    expect(mockDb.getDocument).toHaveBeenCalledWith('syncine_db', 'rooms', 'room-123');
    expect(latency).toBeGreaterThanOrEqual(0);
  });

  it('applies remote seek update when delta exceeds 350ms jitter threshold', () => {
    const sync = new PlaybackSynchronizer(mockDb, 'syncine_db', 'room-123', false);
    sync.mount(mockVideo);

    const packet: SyncPacket = {
      action: 'seek',
      currentTime: 25.5, // 15.5s difference from current 10s
      originTimestamp: Date.now()
    };

    sync.applyRemoteUpdate(packet);
    expect(mockVideo.currentTime).toBe(25.5);
  });

  it('ignores micro-deviations below 350ms threshold to prevent jitter', () => {
    const sync = new PlaybackSynchronizer(mockDb, 'syncine_db', 'room-123', false);
    sync.mount(mockVideo);

    const packet: SyncPacket = {
      action: 'seek',
      currentTime: 10.15, // 150ms difference (less than 350ms threshold)
      originTimestamp: Date.now()
    };

    sync.applyRemoteUpdate(packet);
    expect(mockVideo.currentTime).toBe(10); // remains unchanged
  });

  it('compensates play state target time with transit latency', () => {
    const sync = new PlaybackSynchronizer(mockDb, 'syncine_db', 'room-123', false);
    sync.mount(mockVideo);

    // Simulated 500ms transit delay
    const packet: SyncPacket = {
      action: 'play',
      currentTime: 30,
      originTimestamp: Date.now() - 500
    };

    sync.applyRemoteUpdate(packet);
    expect(mockVideo.currentTime).toBeGreaterThanOrEqual(30.4);
    expect(mockVideo.play).toHaveBeenCalled();
  });

  it('does not apply remote updates if node is designated broadcaster', () => {
    const sync = new PlaybackSynchronizer(mockDb, 'syncine_db', 'room-123', true);
    sync.mount(mockVideo);

    const packet: SyncPacket = {
      action: 'seek',
      currentTime: 99,
      originTimestamp: Date.now()
    };

    sync.applyRemoteUpdate(packet);
    expect(mockVideo.currentTime).toBe(10); // broadcaster state unchanged
  });
});
