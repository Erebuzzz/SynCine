import { describe, it, expect, vi, afterEach } from 'vitest';
import { captureDisplayMedia, captureUserMedia } from '../src/lib/media-capture';

describe('Media Capture Test Suite', () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
    vi.restoreAllMocks();
  });

  it('captures user media with noise suppression and echo cancellation', async () => {
    const mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ kind: 'audio', stop: vi.fn() }],
      getAudioTracks: () => [{ kind: 'audio', stop: vi.fn() }]
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true
    });

    const stream = await captureUserMedia(false);
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });
    expect(stream).toBeDefined();
  });

  it('captures display media with video parameters in standard browsers', async () => {
    const mockGetDisplayMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ kind: 'video', stop: vi.fn() }],
      getAudioTracks: () => []
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getDisplayMedia: mockGetDisplayMedia },
      configurable: true
    });

    const result = await captureDisplayMedia();
    expect(mockGetDisplayMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1920 }
        })
      })
    );
    expect(result.hasAudio).toBe(false);
  });
});
