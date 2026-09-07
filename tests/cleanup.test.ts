import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deleteRoomMessages,
  deleteRoomSignaling,
  deleteRoomData,
  deleteRoomCompletely,
  scheduleRoomExpiration,
  sweepExpiredRooms
} from '../src/lib/cleanup';
import { databases } from '../src/lib/appwrite';

vi.mock('../src/lib/appwrite', () => {
  return {
    databases: {
      listDocuments: vi.fn(),
      deleteDocument: vi.fn(),
      updateDocument: vi.fn(),
      getDocument: vi.fn()
    },
    APPWRITE_DATABASE_ID: 'syncine_db',
    COLLECTIONS: {
      ROOMS: 'rooms',
      MESSAGES: 'messages',
      SIGNALING: 'signaling'
    },
    Query: {
      equal: vi.fn((attr, val) => `equal(${attr}, ${val})`),
      lessThan: vi.fn((attr, val) => `lessThan(${attr}, ${val})`),
      limit: vi.fn((n) => `limit(${n})`)
    }
  };
});

describe('Cleanup and Room Lifecycle Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteRoomMessages fetches and deletes all matching messages', async () => {
    vi.mocked(databases.listDocuments).mockResolvedValueOnce({
      documents: [{ $id: 'msg-1' }, { $id: 'msg-2' }],
      total: 2
    } as any);

    vi.mocked(databases.deleteDocument).mockResolvedValue({} as any);

    const count = await deleteRoomMessages('room-abc');
    expect(count).toBe(2);
    expect(databases.deleteDocument).toHaveBeenCalledTimes(2);
    expect(databases.deleteDocument).toHaveBeenCalledWith('syncine_db', 'messages', 'msg-1');
    expect(databases.deleteDocument).toHaveBeenCalledWith('syncine_db', 'messages', 'msg-2');
  });

  it('deleteRoomSignaling fetches and deletes all matching signaling documents', async () => {
    vi.mocked(databases.listDocuments).mockResolvedValueOnce({
      documents: [{ $id: 'sig-1' }],
      total: 1
    } as any);

    vi.mocked(databases.deleteDocument).mockResolvedValue({} as any);

    const count = await deleteRoomSignaling('room-abc');
    expect(count).toBe(1);
    expect(databases.deleteDocument).toHaveBeenCalledWith('syncine_db', 'signaling', 'sig-1');
  });

  it('deleteRoomData purges both messages and signaling records', async () => {
    vi.mocked(databases.listDocuments).mockResolvedValue({
      documents: [],
      total: 0
    } as any);

    const result = await deleteRoomData('room-xyz');
    expect(result).toEqual({ deletedMessages: 0, deletedSignals: 0 });
    expect(databases.listDocuments).toHaveBeenCalledTimes(2);
  });

  it('deleteRoomCompletely purges room document and all child data', async () => {
    vi.mocked(databases.listDocuments).mockResolvedValue({
      documents: [],
      total: 0
    } as any);
    vi.mocked(databases.deleteDocument).mockResolvedValue({} as any);

    const success = await deleteRoomCompletely('room-del');
    expect(success).toBe(true);
    expect(databases.deleteDocument).toHaveBeenCalledWith('syncine_db', 'rooms', 'room-del');
  });

  it('scheduleRoomExpiration updates room with participantCount 0 and 3-hour expiration', async () => {
    vi.mocked(databases.updateDocument).mockResolvedValue({} as any);

    await scheduleRoomExpiration('room-exp', 3);
    expect(databases.updateDocument).toHaveBeenCalledWith(
      'syncine_db',
      'rooms',
      'room-exp',
      expect.objectContaining({
        participantCount: 0,
        expiresAt: expect.any(String)
      })
    );
  });

  it('sweepExpiredRooms deletes rooms whose expiresAt has passed', async () => {
    const pastTime = new Date(Date.now() - 10000).toISOString();
    vi.mocked(databases.listDocuments)
      .mockResolvedValueOnce({
        documents: [{ $id: 'expired-room-1', expiresAt: pastTime, isPermanent: false }],
        total: 1
      } as any)
      .mockResolvedValue({
        documents: [],
        total: 0
      } as any);

    vi.mocked(databases.deleteDocument).mockResolvedValue({} as any);

    const stats = await sweepExpiredRooms();
    expect(stats.expiredRooms).toBe(1);
    expect(databases.deleteDocument).toHaveBeenCalledWith('syncine_db', 'rooms', 'expired-room-1');
  });
});
