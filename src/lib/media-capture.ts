export const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export interface ScreenCaptureResult {
  stream: MediaStream;
  hasAudio: boolean;
}

/**
 * Captures screen or tab display media.
 * Gracefully omits audio constraints on Safari to prevent DOMException errors.
 */
export async function captureDisplayMedia(): Promise<ScreenCaptureResult> {
  if (!navigator?.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture API is not supported on this browser or device.');
  }

  const audioConstraints: any = !isSafari
    ? {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false
      }
    : false;

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: { ideal: 30, max: 60 },
      width: { ideal: 1920 }
    },
    audio: audioConstraints
  });

  const hasAudio = stream.getAudioTracks().length > 0;
  return { stream, hasAudio };
}

/**
 * Captures microphone audio with low-latency acoustic echo cancellation.
 */
export async function captureUserMedia(withVideo: boolean = false): Promise<MediaStream> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('User media API is not supported on this browser or device.');
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: withVideo
      ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      : false
  });
}
