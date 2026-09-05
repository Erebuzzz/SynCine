import { describe, it, expect } from 'vitest';
import { extractYouTubeId, normalizeRoomDocument, RoomDocument } from '../src/lib/appwrite';

describe('YouTube Video ID Extractor Suite', () => {
  it('extracts video ID from standard watch URLs', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts video ID from shortened youtu.be links', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ');
  });

  it('extracts video ID from embed and live URLs', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('recognizes direct 11-character video IDs', () => {
    expect(extractYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null on invalid or unsupported URLs', () => {
    expect(extractYouTubeId('https://vimeo.com/123456')).toBeNull();
    expect(extractYouTubeId('https://google.com')).toBeNull();
    expect(extractYouTubeId('')).toBeNull();
    expect(extractYouTubeId('abc')).toBeNull();
  });
});

describe('normalizeRoomDocument Suite', () => {
  it('preserves native YouTube room document without changes', () => {
    const nativeDoc = {
      $id: 'room-1',
      $createdAt: '',
      $updatedAt: '',
      $permissions: [],
      $databaseId: 'syncine_db',
      $collectionId: 'rooms',
      name: 'Cinema Room',
      hostId: 'user-1',
      mediaMode: 'youtube' as const,
      youtubeVideoId: 'dQw4w9WgXcQ',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      syncState: ''
    };

    const normalized = normalizeRoomDocument(nativeDoc as RoomDocument);
    expect(normalized.mediaMode).toBe('youtube');
    expect(normalized.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });

  it('extracts YouTube metadata and locks from syncState fallback', () => {
    const fallbackDoc = {
      $id: 'room-2',
      $createdAt: '',
      $updatedAt: '',
      $permissions: [],
      $databaseId: 'syncine_db',
      $collectionId: 'rooms',
      name: 'Fallback Room',
      hostId: 'user-2',
      mediaMode: 'screen' as const,
      syncState: JSON.stringify({
        mode: 'youtube',
        youtubeVideoId: 'kJQP7kiw5Fk',
        youtubeUrl: 'https://youtu.be/kJQP7kiw5Fk',
        isLocked: true
      })
    };

    const normalized = normalizeRoomDocument(fallbackDoc as RoomDocument);
    expect(normalized.mediaMode).toBe('youtube');
    expect(normalized.youtubeVideoId).toBe('kJQP7kiw5Fk');
    expect(normalized.youtubeUrl).toBe('https://youtu.be/kJQP7kiw5Fk');
    expect(normalized.isLocked).toBe(true);
  });

  it('does not mutate standard screen or local file rooms', () => {
    const screenDoc = {
      $id: 'room-3',
      $createdAt: '',
      $updatedAt: '',
      $permissions: [],
      $databaseId: 'syncine_db',
      $collectionId: 'rooms',
      name: 'Screen Room',
      hostId: 'user-3',
      mediaMode: 'screen' as const,
      syncState: ''
    };

    const normalized = normalizeRoomDocument(screenDoc as RoomDocument);
    expect(normalized.mediaMode).toBe('screen');
    expect(normalized.youtubeVideoId).toBeUndefined();
  });
});
