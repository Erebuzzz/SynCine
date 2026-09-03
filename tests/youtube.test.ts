import { describe, it, expect } from 'vitest';
import { extractYouTubeId } from '../src/lib/appwrite';

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
