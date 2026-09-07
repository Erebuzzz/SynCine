/**
 * Web Audio API Cinema Audio Processor
 * Provides Speech Clarity Equalization and Night Mode Dynamic Range Compression.
 */

export type DialogueBoostLevel = 'off' | 'medium' | 'high';

export interface AudioProcessingConfig {
  dialogueBoost?: DialogueBoostLevel;
  nightMode?: boolean;
}

const elementSourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  const AudioContextClass = typeof window !== 'undefined'
    ? (window.AudioContext || (window as any).webkitAudioContext)
    : null;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  return sharedAudioCtx;
}

export function resetSharedAudioContext(): void {
  try {
    if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') {
      sharedAudioCtx.close().catch(() => {});
    }
  } catch {}
  sharedAudioCtx = null;
}

export class CinemaAudioProcessor {
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private clarityFilter: BiquadFilterNode | null = null;
  private nightCompressor: DynamicsCompressorNode | null = null;
  private outputGain: GainNode | null = null;
  private isInitialized = false;

  /**
   * Initializes the audio graph from an HTMLMediaElement.
   */
  public attachMediaElement(element: HTMLMediaElement, config: AudioProcessingConfig): boolean {
    try {
      this.disconnectGraph();

      const ctx = getSharedAudioContext();
      if (!ctx) return false;
      this.audioCtx = ctx;

      // Create Peaking Filter for Dialogue Clarity (centered at human vocal presence 2.5 kHz)
      this.clarityFilter = this.audioCtx.createBiquadFilter();
      this.clarityFilter.type = 'peaking';
      this.clarityFilter.frequency.value = 2500;
      this.clarityFilter.Q.value = 1.2;

      // Create Dynamics Compressor for Night Mode (tames sudden explosions, raises quiet whispers)
      this.nightCompressor = this.audioCtx.createDynamicsCompressor();

      // Create Output Gain
      this.outputGain = this.audioCtx.createGain();

      // Retrieve or create the single MediaElementAudioSourceNode for this DOM element
      let source = elementSourceMap.get(element);
      if (!source) {
        source = this.audioCtx.createMediaElementSource(element);
        elementSourceMap.set(element, source);
      }
      this.sourceNode = source;

      // Disconnect old connections on this source node before attaching new graph
      try {
        source.disconnect();
      } catch {}

      // Connect graph: Source -> Filter -> Compressor -> Gain -> Destination
      source.connect(this.clarityFilter);
      this.clarityFilter.connect(this.nightCompressor);
      this.nightCompressor.connect(this.outputGain);
      this.outputGain.connect(this.audioCtx.destination);

      this.isInitialized = true;
      this.applyConfig(config);

      if (this.audioCtx.state === 'suspended') {
        const resumeOnPlay = () => {
          this.audioCtx?.resume();
          element.removeEventListener('play', resumeOnPlay);
        };
        element.addEventListener('play', resumeOnPlay);
      }

      return true;
    } catch (err) {
      console.warn('CinemaAudioProcessor initialization error:', err);
      return false;
    }
  }

  /**
   * Updates audio processing parameters on the fly without re-routing.
   */
  public applyConfig(config: AudioProcessingConfig): void {
    if (!this.audioCtx || !this.isInitialized) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    // Apply Speech Clarity Boost
    if (this.clarityFilter) {
      switch (config.dialogueBoost) {
        case 'high':
          this.clarityFilter.gain.setTargetAtTime(8.0, this.audioCtx.currentTime, 0.05);
          break;
        case 'medium':
          this.clarityFilter.gain.setTargetAtTime(4.5, this.audioCtx.currentTime, 0.05);
          break;
        case 'off':
        default:
          this.clarityFilter.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
          break;
      }
    }

    // Apply Night Mode Compression
    if (this.nightCompressor) {
      if (config.nightMode) {
        this.nightCompressor.threshold.setTargetAtTime(-24, this.audioCtx.currentTime, 0.05);
        this.nightCompressor.knee.setTargetAtTime(12, this.audioCtx.currentTime, 0.05);
        this.nightCompressor.ratio.setTargetAtTime(12, this.audioCtx.currentTime, 0.05);
        this.nightCompressor.attack.setTargetAtTime(0.003, this.audioCtx.currentTime, 0.05);
        this.nightCompressor.release.setTargetAtTime(0.25, this.audioCtx.currentTime, 0.05);
      } else {
        // Transparent passthrough
        this.nightCompressor.threshold.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
        this.nightCompressor.ratio.setTargetAtTime(1, this.audioCtx.currentTime, 0.05);
      }
    }
  }

  /**
   * Cleans up audio graph nodes without invalidating the shared context.
   */
  private disconnectGraph(): void {
    try {
      this.sourceNode?.disconnect();
      this.clarityFilter?.disconnect();
      this.nightCompressor?.disconnect();
      this.outputGain?.disconnect();
    } catch {
      // Ignore cleanup errors
    } finally {
      this.sourceNode = null;
      this.clarityFilter = null;
      this.nightCompressor = null;
      this.outputGain = null;
      this.isInitialized = false;
    }
  }

  public dispose(): void {
    this.disconnectGraph();
  }

  public destroy(): void {
    this.dispose();
    resetSharedAudioContext();
  }
}
