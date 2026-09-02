/**
 * Diagnostics & Telemetry Engine for SynCine.
 * Measures WebRTC P2P network metrics (RTT, Jitter, Packet Loss, Bitrate)
 * and client-side system/CPU performance to isolate streaming bottlenecks.
 */

export interface TelemetryStats {
  rtt: number; // Round-trip time in milliseconds
  jitter: number; // Jitter in milliseconds
  packetLoss: number; // Packet loss percentage (0 - 100)
  downstreamKbps: number;
  upstreamKbps: number;
  systemLoad: number; // Estimated UI/CPU thread load (0 - 100%)
  cpuCores: number;
  memoryUsedMb: number | null;
  memoryLimitMb: number | null;
  status: 'healthy' | 'network_bottleneck' | 'cpu_overload' | 'contention';
  verdict: string;
  recommendation: string;
}

export interface LatencyDataPoint {
  timestamp: number;
  rtt: number;
  systemLoad: number;
}

/**
 * Monitors UI thread responsiveness and frame delay to estimate CPU/system rendering load.
 * High frame delivery delay (>30ms vs 16.67ms) reflects heavy CPU or rendering contention.
 */
export class SystemLoadMonitor {
  private isRunning = false;
  private animId: number | null = null;
  private lastTimestamp = 0;
  private frameDeltas: number[] = [];
  private maxSamples = 60;
  private cachedLoad = 12;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private loop = () => {
    if (!this.isRunning) return;
    const now = performance.now();
    const delta = now - this.lastTimestamp;
    this.lastTimestamp = now;

    if (delta > 0 && delta < 500) {
      this.frameDeltas.push(delta);
      if (this.frameDeltas.length > this.maxSamples) {
        this.frameDeltas.shift();
      }
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  /**
   * Calculates a smoothed CPU/main-thread load percentage (0 - 100%).
   */
  public getLoad(): number {
    if (this.frameDeltas.length < 5) {
      return this.cachedLoad;
    }

    const targetInterval = 1000 / 60; // 16.67ms
    let delayedFrames = 0;
    let totalExcessMs = 0;

    for (const d of this.frameDeltas) {
      if (d > targetInterval * 1.35) {
        delayedFrames++;
        totalExcessMs += d - targetInterval;
      }
    }

    const frameDropRate = delayedFrames / this.frameDeltas.length;
    const avgExcess = totalExcessMs / this.frameDeltas.length;

    // Convert jitter into a 0 - 100 scale
    let estimatedLoad = 10 + frameDropRate * 60 + Math.min(30, (avgExcess / 15) * 30);
    estimatedLoad = Math.min(99, Math.max(5, Math.round(estimatedLoad)));

    // Smooth transition
    this.cachedLoad = Math.round(this.cachedLoad * 0.7 + estimatedLoad * 0.3);
    return this.cachedLoad;
  }
}

/**
 * WebRTC stats state cache for calculating bitrate deltas.
 */
interface BitrateCache {
  lastTime: number;
  lastBytesReceived: number;
  lastBytesSent: number;
}

let bitrateCache: BitrateCache = {
  lastTime: 0,
  lastBytesReceived: 0,
  lastBytesSent: 0
};

/**
 * Collects live telemetry metrics from active WebRTC peer connections
 * and client system monitors.
 */
export async function collectTelemetry(
  peerConnections: Map<string, RTCPeerConnection> | undefined,
  systemMonitor?: SystemLoadMonitor,
  fallbackHttpPing: number = 32
): Promise<TelemetryStats> {
  let rtt = 0;
  let rttCount = 0;
  let jitter = 0;
  let jitterCount = 0;
  let packetsLost = 0;
  let packetsReceived = 0;
  let totalBytesReceived = 0;
  let totalBytesSent = 0;

  if (peerConnections && peerConnections.size > 0) {
    for (const pc of peerConnections.values()) {
      try {
        const stats = await pc.getStats();
        stats.forEach((report) => {
          // Candidate pair round trip time
          if (
            (report.type === 'candidate-pair' || report.type === 'remote-candidate') &&
            report.state === 'succeeded' &&
            typeof report.currentRoundTripTime === 'number'
          ) {
            rtt += report.currentRoundTripTime * 1000;
            rttCount++;
          }

          // Inbound RTP (video/audio)
          if (report.type === 'inbound-rtp') {
            if (typeof report.jitter === 'number') {
              jitter += report.jitter * 1000;
              jitterCount++;
            }
            if (typeof report.packetsLost === 'number') {
              packetsLost += report.packetsLost;
            }
            if (typeof report.packetsReceived === 'number') {
              packetsReceived += report.packetsReceived;
            }
            if (typeof report.bytesReceived === 'number') {
              totalBytesReceived += report.bytesReceived;
            }
          }

          // Outbound RTP
          if (report.type === 'outbound-rtp') {
            if (typeof report.bytesSent === 'number') {
              totalBytesSent += report.bytesSent;
            }
          }
        });
      } catch (err) {
        console.warn('Failed to query WebRTC stats for peer:', err);
      }
    }
  }

  // Calculate final network metrics
  const effectiveRtt = rttCount > 0 ? Math.round(rtt / rttCount) : fallbackHttpPing;
  const effectiveJitter = jitterCount > 0 ? Math.round(jitter / jitterCount) : 4;
  const totalPackets = packetsLost + packetsReceived;
  const packetLossPercent =
    totalPackets > 0 ? Math.min(100, Math.round((packetsLost / totalPackets) * 1000) / 10) : 0;

  // Calculate bitrate
  const now = performance.now();
  let downstreamKbps = 0;
  let upstreamKbps = 0;

  if (bitrateCache.lastTime > 0) {
    const elapsedSec = (now - bitrateCache.lastTime) / 1000;
    if (elapsedSec > 0.4) {
      const rxBytes = Math.max(0, totalBytesReceived - bitrateCache.lastBytesReceived);
      const txBytes = Math.max(0, totalBytesSent - bitrateCache.lastBytesSent);
      downstreamKbps = Math.round((rxBytes * 8) / elapsedSec / 1000);
      upstreamKbps = Math.round((txBytes * 8) / elapsedSec / 1000);
    }
  }

  bitrateCache = {
    lastTime: now,
    lastBytesReceived: totalBytesReceived,
    lastBytesSent: totalBytesSent
  };

  // System & CPU metrics
  const systemLoad = systemMonitor ? systemMonitor.getLoad() : 15;
  const cpuCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;

  let memoryUsedMb: number | null = null;
  let memoryLimitMb: number | null = null;
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const mem = (performance as any).memory;
    memoryUsedMb = Math.round(mem.usedJSHeapSize / (1024 * 1024));
    memoryLimitMb = Math.round(mem.jsHeapSizeLimit / (1024 * 1024));
  }

  // Root cause analysis logic
  const isHighLatency = effectiveRtt > 160 || packetLossPercent > 3.0;
  const isHighCpu = systemLoad > 65;

  let status: TelemetryStats['status'] = 'healthy';
  let verdict = 'Optimal Connection & Performance';
  let recommendation = 'Your stream pipeline and local system are running smoothly.';

  if (isHighLatency && isHighCpu) {
    status = 'contention';
    verdict = 'High Network Latency & CPU Load Detected';
    recommendation =
      'Both your network and processor are experiencing contention. Lower stream resolution to 480p or 360p and close heavy browser tabs.';
  } else if (isHighLatency) {
    status = 'network_bottleneck';
    verdict = 'Network Latency / Packet Loss Detected';
    recommendation =
      `High network round-trip delay (${effectiveRtt}ms). Consider switching stream resolution to 480p or 360p to reduce bandwidth demand.`;
  } else if (isHighCpu) {
    status = 'cpu_overload';
    verdict = 'Hardware / CPU Rendering Contention';
    recommendation =
      'Your processor or main thread is under heavy load. Jitter is likely caused by CPU throttling rather than internet speed.';
  }

  return {
    rtt: effectiveRtt,
    jitter: effectiveJitter,
    packetLoss: packetLossPercent,
    downstreamKbps,
    upstreamKbps,
    systemLoad,
    cpuCores,
    memoryUsedMb,
    memoryLimitMb,
    status,
    verdict,
    recommendation
  };
}
