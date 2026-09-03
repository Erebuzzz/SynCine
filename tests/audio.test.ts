import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CinemaAudioProcessor } from '../src/lib/audio-processing';

describe('Cinema Audio Processing Engine Suite', () => {
  let mockAudioContext: any;
  let mockGainNode: any;
  let mockBiquadFilterNode: any;
  let mockDynamicsCompressorNode: any;

  const createMockParam = (initial = 0) => ({
    value: initial,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn()
  });

  beforeEach(() => {
    mockGainNode = {
      gain: createMockParam(1),
      connect: vi.fn()
    };

    mockBiquadFilterNode = {
      type: 'peaking',
      frequency: createMockParam(2500),
      Q: createMockParam(1.2),
      gain: createMockParam(0),
      connect: vi.fn()
    };

    mockDynamicsCompressorNode = {
      threshold: createMockParam(0),
      knee: createMockParam(30),
      ratio: createMockParam(1),
      attack: createMockParam(0.003),
      release: createMockParam(0.25),
      connect: vi.fn()
    };

    mockAudioContext = {
      currentTime: 0,
      state: 'running',
      createMediaElementSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
      createBiquadFilter: vi.fn().mockReturnValue(mockBiquadFilterNode),
      createDynamicsCompressor: vi.fn().mockReturnValue(mockDynamicsCompressorNode),
      createGain: vi.fn().mockReturnValue(mockGainNode),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    };

    (window as any).AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
  });

  it('initializes speech clarity filter and night mode compressor correctly', () => {
    const processor = new CinemaAudioProcessor();
    const mockVideo = document.createElement('video');

    processor.attachMediaElement(mockVideo, { dialogueBoost: 'medium', nightMode: true });

    expect(mockBiquadFilterNode.type).toBe('peaking');
    expect(mockBiquadFilterNode.frequency.value).toBe(2500);
    expect(mockBiquadFilterNode.Q.value).toBe(1.2);

    // Medium boost applies +4.5 dB targeting dialogue presence
    expect(mockBiquadFilterNode.gain.setTargetAtTime).toHaveBeenCalledWith(4.5, 0, 0.05);

    // Night mode active sets threshold to -24 dB and ratio to 12
    expect(mockDynamicsCompressorNode.threshold.setTargetAtTime).toHaveBeenCalledWith(-24, 0, 0.05);
    expect(mockDynamicsCompressorNode.ratio.setTargetAtTime).toHaveBeenCalledWith(12, 0, 0.05);

    processor.destroy();
  });

  it('updates dialogue boost levels dynamically', () => {
    const processor = new CinemaAudioProcessor();
    const mockVideo = document.createElement('video');

    processor.attachMediaElement(mockVideo, { dialogueBoost: 'off', nightMode: false });
    expect(mockBiquadFilterNode.gain.setTargetAtTime).toHaveBeenCalledWith(0, 0, 0.05);

    // Bump to high boost (+8.0 dB vocal isolation)
    processor.applyConfig({ dialogueBoost: 'high' });
    expect(mockBiquadFilterNode.gain.setTargetAtTime).toHaveBeenCalledWith(8.0, 0, 0.05);

    processor.destroy();
  });

  it('toggles night mode dynamics compression threshold and ratio', () => {
    const processor = new CinemaAudioProcessor();
    const mockVideo = document.createElement('video');

    processor.attachMediaElement(mockVideo, { dialogueBoost: 'off', nightMode: false });
    expect(mockDynamicsCompressorNode.threshold.setTargetAtTime).toHaveBeenCalledWith(0, 0, 0.05);

    processor.applyConfig({ nightMode: true });
    expect(mockDynamicsCompressorNode.threshold.setTargetAtTime).toHaveBeenCalledWith(-24, 0, 0.05);
    expect(mockDynamicsCompressorNode.ratio.setTargetAtTime).toHaveBeenCalledWith(12, 0, 0.05);

    processor.destroy();
  });
});
