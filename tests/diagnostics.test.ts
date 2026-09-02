import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SystemLoadMonitor,
  collectTelemetry,
  TelemetryStats
} from '../src/lib/diagnostics';
import { RESOLUTION_PRESETS } from '../src/lib/media-capture';

describe('Diagnostics & Telemetry Test Suite', () => {
  let monitor: SystemLoadMonitor;

  beforeEach(() => {
    monitor = new SystemLoadMonitor();
  });

  afterEach(() => {
    monitor.stop();
    vi.restoreAllMocks();
  });

  it('validates all video resolution presets have defined dimensions and bitrates', () => {
    expect(RESOLUTION_PRESETS['1080p']).toBeDefined();
    expect(RESOLUTION_PRESETS['1080p'].width).toBe(1920);
    expect(RESOLUTION_PRESETS['1080p'].height).toBe(1080);
    expect(RESOLUTION_PRESETS['1080p'].maxBitrate).toBeGreaterThan(2_000_000);

    expect(RESOLUTION_PRESETS['720p']).toBeDefined();
    expect(RESOLUTION_PRESETS['720p'].width).toBe(1280);
    expect(RESOLUTION_PRESETS['720p'].height).toBe(720);

    expect(RESOLUTION_PRESETS['480p']).toBeDefined();
    expect(RESOLUTION_PRESETS['480p'].width).toBe(854);
    expect(RESOLUTION_PRESETS['480p'].height).toBe(480);

    expect(RESOLUTION_PRESETS['360p']).toBeDefined();
    expect(RESOLUTION_PRESETS['360p'].width).toBe(640);
    expect(RESOLUTION_PRESETS['360p'].height).toBe(360);
    expect(RESOLUTION_PRESETS['360p'].maxBitrate).toBeLessThan(RESOLUTION_PRESETS['480p'].maxBitrate);
  });

  it('initializes and stops SystemLoadMonitor without errors', () => {
    monitor.start();
    const load = monitor.getLoad();
    expect(load).toBeGreaterThanOrEqual(5);
    expect(load).toBeLessThanOrEqual(100);
    monitor.stop();
  });

  it('collects telemetry fallback when no peers are connected', async () => {
    const stats: TelemetryStats = await collectTelemetry(undefined, monitor, 45);

    expect(stats.rtt).toBe(45);
    expect(stats.status).toBe('healthy');
    expect(stats.verdict).toContain('Optimal');
    expect(stats.systemLoad).toBeGreaterThan(0);
    expect(stats.cpuCores).toBeGreaterThanOrEqual(1);
  });

  it('flags network_bottleneck when round-trip time is elevated', async () => {
    const mockStatsReport = new Map<string, any>([
      [
        'cand-1',
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.22 // 220ms
        }
      ],
      [
        'inbound-1',
        {
          type: 'inbound-rtp',
          jitter: 0.025,
          packetsLost: 8,
          packetsReceived: 92
        }
      ]
    ]);

    const mockPc = {
      getStats: vi.fn().mockResolvedValue(mockStatsReport)
    } as unknown as RTCPeerConnection;

    const peerMap = new Map<string, RTCPeerConnection>([['peer-1', mockPc]]);

    const stats = await collectTelemetry(peerMap, monitor);
    expect(stats.rtt).toBe(220);
    expect(stats.packetLoss).toBe(8);
    expect(stats.status).toBe('network_bottleneck');
    expect(stats.verdict).toContain('Network Latency');
  });
});
