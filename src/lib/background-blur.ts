import * as SelfieSegmentationPkg from '@mediapipe/selfie_segmentation';
import { isSoftwareRenderingDetected } from './performance-detect';

export const BLUR_PRESETS = {
  OFF: 0,
  SUBTLE: 8,
  PORTRAIT: 16,
  DEEP: 24
} as const;

export const MAX_BLUR_RADIUS = 32;
const STORAGE_KEY = 'syncine-bg-blur-radius';

export function getStoredBlurRadius(): number {
  if (typeof window === 'undefined') return BLUR_PRESETS.OFF;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return BLUR_PRESETS.OFF;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0) return BLUR_PRESETS.OFF;
    return Math.min(MAX_BLUR_RADIUS, parsed);
  } catch {
    return BLUR_PRESETS.OFF;
  }
}

export function setStoredBlurRadius(radius: number): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = Math.max(0, Math.min(MAX_BLUR_RADIUS, Math.round(radius)));
    localStorage.setItem(STORAGE_KEY, clamped.toString());
  } catch {}
}

export class BackgroundBlurEngine {
  private videoElement: HTMLVideoElement | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private outputCtx: CanvasRenderingContext2D | null = null;
  private maskCanvas: HTMLCanvasElement | null = null;
  private maskCtx: CanvasRenderingContext2D | null = null;
  private personCanvas: HTMLCanvasElement | null = null;
  private personCtx: CanvasRenderingContext2D | null = null;

  private segmenter: any = null;
  private isSegmenterLoaded = false;
  private isLoadingModel = false;
  private isRunning = false;

  private blurRadius: number = BLUR_PRESETS.OFF;
  private rawStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private activeVideoTrack: MediaStreamTrack | null = null;

  private animFrameId: number | null = null;
  private rvfcHandle: number | null = null;
  private onReadyCallbacks: Array<() => void> = [];

  constructor() {
    this.blurRadius = getStoredBlurRadius();
  }

  public getBlurRadius(): number {
    return this.blurRadius;
  }

  public setBlurRadius(radius: number): void {
    const clamped = Math.max(0, Math.min(MAX_BLUR_RADIUS, Math.round(radius)));
    this.blurRadius = clamped;
    setStoredBlurRadius(clamped);

    // If blur turned off and currently running with no blur needed
    if (clamped === 0 && this.isRunning) {
      this.pauseProcessing();
    } else if (clamped > 0 && !this.isRunning && this.rawStream) {
      this.resumeProcessing();
    }
  }

  public isEnabled(): boolean {
    return this.blurRadius > 0;
  }

  /**
   * Initializes the MediaPipe SelfieSegmentation model lazily on demand.
   */
  private async initModel(): Promise<void> {
    if (this.isSegmenterLoaded) return;
    if (this.isLoadingModel) {
      return new Promise<void>((resolve) => {
        this.onReadyCallbacks.push(resolve);
      });
    }

    this.isLoadingModel = true;

    try {
      const SelfieSegmentationClass =
        (SelfieSegmentationPkg as any).SelfieSegmentation ||
        (SelfieSegmentationPkg as any).default?.SelfieSegmentation ||
        (typeof window !== 'undefined' ? (window as any).SelfieSegmentation : undefined);

      if (!SelfieSegmentationClass) {
        throw new Error('MediaPipe SelfieSegmentation class not found.');
      }

      this.segmenter = new SelfieSegmentationClass({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
        }
      });

      // modelSelection: 1 is landscape model (fast and optimized for seated video conference calls)
      this.segmenter.setOptions({
        modelSelection: 1,
        selfieMode: false
      });

      this.segmenter.onResults((results: any) => {
        this.compositeFrame(results);
      });

      await this.segmenter.initialize();
      this.isSegmenterLoaded = true;
      this.isLoadingModel = false;

      this.onReadyCallbacks.forEach((cb) => cb());
      this.onReadyCallbacks = [];
    } catch (err) {
      this.isLoadingModel = false;
      this.onReadyCallbacks = [];
      console.warn('BackgroundBlurEngine: Failed to initialize MediaPipe segmenter:', err);
      throw err;
    }
  }

  /**
   * Starts processing a camera MediaStream.
   * If blurRadius is 0, returns the raw stream directly without pipeline overhead.
   * If blurRadius > 0, initializes segmentation and returns the processed canvas stream.
   */
  public async processStream(cameraStream: MediaStream): Promise<MediaStream> {
    this.rawStream = cameraStream;
    const originalTrack = cameraStream.getVideoTracks()[0];
    if (!originalTrack) return cameraStream;

    this.activeVideoTrack = originalTrack;

    if (this.blurRadius === 0) {
      return cameraStream;
    }

    return this.setupProcessedPipeline(cameraStream);
  }

  private async setupProcessedPipeline(cameraStream: MediaStream): Promise<MediaStream> {
    await this.initModel();

    if (typeof document === 'undefined') return cameraStream;

    // Create offscreen video element to feed the ML model
    if (!this.videoElement) {
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      this.videoElement.style.display = 'none';
      document.body.appendChild(this.videoElement);
    }

    this.videoElement.srcObject = cameraStream;
    await this.videoElement.play().catch(() => {});

    // Determine target canvas dimensions
    const settings = this.activeVideoTrack?.getSettings();
    const isSoftware = isSoftwareRenderingDetected();
    // Cap resolution to 640x360 if software rendering, otherwise 1280x720 max
    const maxTargetWidth = isSoftware ? 640 : 1280;
    const sourceWidth = settings?.width || this.videoElement.videoWidth || 640;
    const sourceHeight = settings?.height || this.videoElement.videoHeight || 480;
    const aspect = sourceWidth / sourceHeight || (16 / 9);

    const targetWidth = Math.min(sourceWidth, maxTargetWidth);
    const targetHeight = Math.round(targetWidth / aspect);

    // Initialize main output canvas
    if (!this.outputCanvas) {
      this.outputCanvas = document.createElement('canvas');
      this.outputCtx = this.outputCanvas.getContext('2d', { desynchronized: true });
    }
    this.outputCanvas.width = targetWidth;
    this.outputCanvas.height = targetHeight;

    // Initialize mask canvas for edge feathering
    if (!this.maskCanvas) {
      this.maskCanvas = document.createElement('canvas');
      this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: false });
    }
    this.maskCanvas.width = targetWidth;
    this.maskCanvas.height = targetHeight;

    // Initialize person canvas for foreground cutout
    if (!this.personCanvas) {
      this.personCanvas = document.createElement('canvas');
      this.personCtx = this.personCanvas.getContext('2d', { willReadFrequently: false });
    }
    this.personCanvas.width = targetWidth;
    this.personCanvas.height = targetHeight;

    // Start video frame sending loop
    this.isRunning = true;
    this.scheduleNextFrame();

    // Capture processed 30fps track
    const canvasStream = this.outputCanvas.captureStream(30);
    const processedVideoTrack = canvasStream.getVideoTracks()[0];

    // Combine with original audio tracks if present
    const audioTracks = cameraStream.getAudioTracks();
    this.processedStream = new MediaStream([processedVideoTrack, ...audioTracks]);

    return this.processedStream;
  }

  private scheduleNextFrame(): void {
    if (!this.isRunning || !this.videoElement || !this.segmenter) return;

    if ('requestVideoFrameCallback' in this.videoElement) {
      this.rvfcHandle = (this.videoElement as any).requestVideoFrameCallback(async () => {
        await this.sendFrame();
        this.scheduleNextFrame();
      });
    } else {
      this.animFrameId = requestAnimationFrame(async () => {
        await this.sendFrame();
        this.scheduleNextFrame();
      });
    }
  }

  private async sendFrame(): Promise<void> {
    if (!this.isRunning || !this.videoElement || !this.segmenter) return;
    if (this.videoElement.readyState < 2) return;

    try {
      await this.segmenter.send({ image: this.videoElement });
    } catch {
      // Ignore dropped frames during transitions
    }
  }

  /**
   * Composites the blurred background and unblurred person with edge feathering.
   */
  private compositeFrame(results: any): void {
    if (!this.outputCanvas || !this.outputCtx || !this.maskCanvas || !this.maskCtx || !this.personCanvas || !this.personCtx) {
      return;
    }

    const width = this.outputCanvas.width;
    const height = this.outputCanvas.height;

    // 1. Edge Feathering: Apply a soft blur to the raw segmentation mask
    // to soften jagged cutout staircases and eliminate hard border artifacts.
    this.maskCtx.clearRect(0, 0, width, height);
    this.maskCtx.filter = 'blur(2.5px)';
    this.maskCtx.drawImage(results.segmentationMask, 0, 0, width, height);
    this.maskCtx.filter = 'none';

    // 2. Foreground Isolation: Draw original frame and mask with feathered silhouette
    this.personCtx.clearRect(0, 0, width, height);
    this.personCtx.drawImage(results.image, 0, 0, width, height);
    this.personCtx.globalCompositeOperation = 'destination-in';
    this.personCtx.drawImage(this.maskCanvas, 0, 0, width, height);
    this.personCtx.globalCompositeOperation = 'source-over';

    // 3. Final Compositing on Destination Canvas
    this.outputCtx.clearRect(0, 0, width, height);

    if (this.blurRadius > 0) {
      // Draw Gaussian blurred background
      this.outputCtx.save();
      this.outputCtx.filter = `blur(${this.blurRadius}px)`;
      this.outputCtx.drawImage(results.image, 0, 0, width, height);
      this.outputCtx.restore();
    } else {
      // Draw raw image if blur is 0
      this.outputCtx.drawImage(results.image, 0, 0, width, height);
    }

    // Draw unblurred feathered person on top of blurred background
    this.outputCtx.drawImage(this.personCanvas, 0, 0, width, height);
  }

  private pauseProcessing(): void {
    this.isRunning = false;
    if (this.rvfcHandle !== null && this.videoElement && 'cancelVideoFrameCallback' in this.videoElement) {
      (this.videoElement as any).cancelVideoFrameCallback(this.rvfcHandle);
      this.rvfcHandle = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private resumeProcessing(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextFrame();
  }

  public destroy(): void {
    this.pauseProcessing();

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      if (this.videoElement.parentNode) {
        this.videoElement.parentNode.removeChild(this.videoElement);
      }
      this.videoElement = null;
    }

    if (this.segmenter) {
      try {
        this.segmenter.close();
      } catch {}
      this.segmenter = null;
    }

    this.isSegmenterLoaded = false;
    this.isLoadingModel = false;
    this.rawStream = null;
    this.processedStream = null;
    this.activeVideoTrack = null;
  }
}

// Singleton instance for app-wide camera stream processing
export const backgroundBlur = new BackgroundBlurEngine();
