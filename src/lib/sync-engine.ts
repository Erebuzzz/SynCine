import { Databases } from 'appwrite';

export interface SyncPacket {
  action: 'play' | 'pause' | 'seek';
  currentTime: number;
  originTimestamp: number;
}

export class PlaybackSynchronizer {
  private videoNode?: HTMLVideoElement;
  private isBroadcaster: boolean = false;
  private estimatedLatencyMs: number = 0;
  private isApplyingRemoteUpdate: boolean = false;

  constructor(
    private db: Databases,
    private databaseId: string,
    private roomId: string,
    isBroadcaster: boolean
  ) {
    this.isBroadcaster = isBroadcaster;
    this.benchmarkRoundTrip();
  }

  public mount(videoElement: HTMLVideoElement) {
    this.videoNode = videoElement;
    if (this.isBroadcaster) {
      this.bindBroadcasterEvents();
    }
  }

  public setBroadcaster(isBroadcaster: boolean) {
    this.isBroadcaster = isBroadcaster;
    if (this.videoNode && isBroadcaster) {
      this.bindBroadcasterEvents();
    } else if (this.videoNode && !isBroadcaster) {
      this.unbindBroadcasterEvents();
    }
  }

  public async benchmarkRoundTrip(): Promise<number> {
    try {
      const start = performance.now();
      await this.db.getDocument(this.databaseId, 'rooms', this.roomId);
      this.estimatedLatencyMs = (performance.now() - start) / 2;
      return this.estimatedLatencyMs;
    } catch {
      this.estimatedLatencyMs = 50; // Fallback estimate
      return this.estimatedLatencyMs;
    }
  }

  private onPlay = () => this.emitSync('play');
  private onPause = () => this.emitSync('pause');
  private onSeeked = () => this.emitSync('seek');

  private bindBroadcasterEvents() {
    if (!this.videoNode) return;
    this.videoNode.addEventListener('play', this.onPlay);
    this.videoNode.addEventListener('pause', this.onPause);
    this.videoNode.addEventListener('seeked', this.onSeeked);
  }

  private unbindBroadcasterEvents() {
    if (!this.videoNode) return;
    this.videoNode.removeEventListener('play', this.onPlay);
    this.videoNode.removeEventListener('pause', this.onPause);
    this.videoNode.removeEventListener('seeked', this.onSeeked);
  }

  private emitSync(action: 'play' | 'pause' | 'seek') {
    if (!this.videoNode || !this.isBroadcaster || this.isApplyingRemoteUpdate) return;

    const packet: SyncPacket = {
      action,
      currentTime: this.videoNode.currentTime,
      originTimestamp: Date.now() + this.estimatedLatencyMs
    };

    this.db.updateDocument(this.databaseId, 'rooms', this.roomId, {
      syncState: JSON.stringify(packet)
    }).catch((err) => {
      console.warn('Failed to broadcast playback sync state:', err);
    });
  }

  public applyRemoteUpdate(packet: SyncPacket) {
    if (!this.videoNode || this.isBroadcaster) return;

    this.isApplyingRemoteUpdate = true;

    try {
      const transitTimeSec = Math.max(0, (Date.now() + this.estimatedLatencyMs - packet.originTimestamp) / 1000);
      const targetTime = packet.action === 'play' ? packet.currentTime + transitTimeSec : packet.currentTime;

      // Apply seek threshold of 350ms to prevent jitter and micro-stuttering
      if (Math.abs(this.videoNode.currentTime - targetTime) > 0.35) {
        this.videoNode.currentTime = targetTime;
      }

      if (packet.action === 'play' && this.videoNode.paused) {
        this.videoNode.play().catch((err) => {
          console.warn('Autoplay policy prevented playback, user gesture required:', err);
        });
      } else if (packet.action === 'pause' && !this.videoNode.paused) {
        this.videoNode.pause();
      }
    } finally {
      setTimeout(() => {
        this.isApplyingRemoteUpdate = false;
      }, 50);
    }
  }

  public destroy() {
    this.unbindBroadcasterEvents();
    this.videoNode = undefined;
  }
}
