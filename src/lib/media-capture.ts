export const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export type VideoResolution = '1080p' | '720p' | '480p' | '360p';

export interface ResolutionPreset {
  width: number;
  height: number;
  frameRate: number;
  maxBitrate: number;
  label: string;
  recommendedFor: string;
}

export const RESOLUTION_PRESETS: Record<VideoResolution, ResolutionPreset> = {
  '1080p': {
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 3_500_000,
    label: '1080p Full HD',
    recommendedFor: 'High-speed broadband or fiber (>20 Mbps)'
  },
  '720p': {
    width: 1280,
    height: 720,
    frameRate: 30,
    maxBitrate: 1_800_000,
    label: '720p HD (Balanced)',
    recommendedFor: 'Standard broadband or fast 4G/5G (>8 Mbps)'
  },
  '480p': {
    width: 854,
    height: 480,
    frameRate: 30,
    maxBitrate: 900_000,
    label: '480p Standard',
    recommendedFor: 'Moderate connection or mobile data (>3 Mbps)'
  },
  '360p': {
    width: 640,
    height: 360,
    frameRate: 24,
    maxBitrate: 450_000,
    label: '360p Low Bandwidth',
    recommendedFor: 'Weak connection, hotspot, or high packet loss'
  }
};

export interface MediaDeviceInfoItem {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface UserMediaOptions {
  withVideo?: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
  resolution?: VideoResolution;
  noiseSuppression?: boolean;
  echoCancellation?: boolean;
}

export interface ScreenCaptureResult {
  stream: MediaStream;
  hasAudio: boolean;
}

/**
 * Enumerates audio input devices (microphones).
 */
export async function getAudioInputDevices(): Promise<MediaDeviceInfoItem[]> {
  if (!navigator?.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${index + 1}`,
        groupId: d.groupId
      }));
  } catch (err) {
    console.warn('Failed to enumerate audio input devices:', err);
    return [];
  }
}

/**
 * Enumerates audio output devices (speakers, headphones).
 */
export async function getAudioOutputDevices(): Promise<MediaDeviceInfoItem[]> {
  if (!navigator?.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audiooutput')
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Speaker / Headphone ${index + 1}`,
        groupId: d.groupId
      }));
  } catch (err) {
    console.warn('Failed to enumerate audio output devices:', err);
    return [];
  }
}

/**
 * Enumerates video input devices (cameras).
 */
export async function getVideoInputDevices(): Promise<MediaDeviceInfoItem[]> {
  if (!navigator?.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${index + 1}`,
        groupId: d.groupId
      }));
  } catch (err) {
    console.warn('Failed to enumerate video input devices:', err);
    return [];
  }
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
 * Captures microphone audio and webcam video with customizable devices and resolution.
 * Supports legacy signature captureUserMedia(boolean) for backwards compatibility.
 */
export async function captureUserMedia(
  optionsOrWithVideo: boolean | UserMediaOptions = false
): Promise<MediaStream> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('User media API is not supported on this browser or device.');
  }

  const options: UserMediaOptions =
    typeof optionsOrWithVideo === 'boolean'
      ? { withVideo: optionsOrWithVideo }
      : optionsOrWithVideo;

  const withVideo = Boolean(options.withVideo);
  const resolution = options.resolution || '720p';
  const preset = RESOLUTION_PRESETS[resolution];

  const audioConstraint: MediaTrackConstraints = {
    echoCancellation: options.echoCancellation ?? true,
    noiseSuppression: options.noiseSuppression ?? true,
    autoGainControl: true
  };

  if (options.audioDeviceId) {
    audioConstraint.deviceId = { exact: options.audioDeviceId };
  }

  let videoConstraint: MediaTrackConstraints | boolean = false;
  if (withVideo) {
    videoConstraint = {
      width: { ideal: preset.width },
      height: { ideal: preset.height },
      frameRate: { ideal: preset.frameRate },
      facingMode: 'user'
    };
    if (options.videoDeviceId) {
      videoConstraint.deviceId = { exact: options.videoDeviceId };
    }
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: audioConstraint,
      video: videoConstraint
    });
  } catch (err) {
    console.warn('Constrained getUserMedia failed, retrying with standard constraints:', err);
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo ? true : false
      });
    } catch (fallbackErr) {
      if (withVideo) {
        console.warn('Video + Audio capture failed, falling back to audio-only stream:', fallbackErr);
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
      }
      throw fallbackErr;
    }
  }
}

/**
 * Dynamically adjusts resolution constraints on an active video track without reconnecting.
 */
export async function applyTrackResolution(
  videoTrack: MediaStreamTrack,
  resolution: VideoResolution
): Promise<void> {
  if (videoTrack.kind !== 'video') return;
  const preset = RESOLUTION_PRESETS[resolution];
  try {
    await videoTrack.applyConstraints({
      width: { ideal: preset.width },
      height: { ideal: preset.height },
      frameRate: { ideal: preset.frameRate }
    });
  } catch (err) {
    console.warn(`Failed to apply ${resolution} constraints to video track:`, err);
  }
}

/**
 * Routes an HTMLMediaElement (video or audio) to a specific audio output sink device.
 * Supported in modern Chromium browsers and Safari 17+.
 */
export async function setElementAudioOutput(
  element: HTMLMediaElement,
  deviceId: string
): Promise<boolean> {
  if (typeof (element as any).setSinkId === 'function') {
    try {
      await (element as any).setSinkId(deviceId);
      return true;
    } catch (err) {
      console.warn('Failed to setSinkId on media element:', err);
      return false;
    }
  }
  return false;
}

/**
 * Synthesizes a clean two-tone cinema chime to test audio output on the chosen device.
 */
export async function playAudioOutputTestChime(deviceId?: string): Promise<void> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  if (deviceId && typeof (ctx as any).setSinkId === 'function') {
    try {
      await (ctx as any).setSinkId(deviceId);
    } catch {
      // Ignore if sink assignment on context is not supported
    }
  }

  const now = ctx.currentTime;

  // Tone 1: 523.25 Hz (C5)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.18, now + 0.05);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.35);

  // Tone 2: 783.99 Hz (G5)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(783.99, now + 0.15);
  gain2.gain.setValueAtTime(0, now + 0.15);
  gain2.gain.linearRampToValueAtTime(0.22, now + 0.2);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.6);

  setTimeout(() => {
    ctx.close().catch(() => {});
  }, 1000);
}

const mediaElementSourceCache = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
let globalCaptureAudioContext: AudioContext | null = null;

function getCaptureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!globalCaptureAudioContext || globalCaptureAudioContext.state === 'closed') {
    globalCaptureAudioContext = new AudioCtx();
  }
  if (globalCaptureAudioContext.state === 'suspended') {
    globalCaptureAudioContext.resume().catch(() => {});
  }
  return globalCaptureAudioContext;
}

/**
 * Captures both video and audio tracks from an HTMLVideoElement for WebRTC broadcast.
 * Uses captureStream() with Web Audio API fallback to ensure the audio track is
 * cleanly routed to local speakers for the host and transmitted via WebRTC for peers.
 */
export function captureMediaElementStream(videoElement: HTMLVideoElement): MediaStream {
  let capturedStream: MediaStream;
  if (typeof (videoElement as any).captureStream === 'function') {
    capturedStream = (videoElement as any).captureStream();
  } else if (typeof (videoElement as any).mozCaptureStream === 'function') {
    capturedStream = (videoElement as any).mozCaptureStream();
  } else {
    throw new Error('captureStream is not supported on this browser.');
  }

  const videoTrack = capturedStream.getVideoTracks()[0];
  let audioTrack: MediaStreamTrack | null = capturedStream.getAudioTracks()[0] || null;

  // If captureStream did not supply an audio track, route via Web Audio API
  if (!audioTrack) {
    try {
      const ctx = getCaptureAudioContext();
      if (ctx) {
        let source = mediaElementSourceCache.get(videoElement);
        if (!source) {
          source = ctx.createMediaElementSource(videoElement);
          mediaElementSourceCache.set(videoElement, source);
          // Connect to speaker destination so the host hears playback
          source.connect(ctx.destination);
        }
        const streamDest = ctx.createMediaStreamDestination();
        source.connect(streamDest);
        audioTrack = streamDest.stream.getAudioTracks()[0] || null;
      }
    } catch (e) {
      console.warn('Web Audio capture fallback notice:', e);
    }
  }

  const tracks: MediaStreamTrack[] = [];
  if (videoTrack) tracks.push(videoTrack);
  if (audioTrack) tracks.push(audioTrack);

  return new MediaStream(tracks);
}
