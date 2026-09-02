import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  Video,
  Activity,
  Check,
  Play,
  Cpu,
  Wifi,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import {
  VideoResolution,
  RESOLUTION_PRESETS,
  MediaDeviceInfoItem,
  playAudioOutputTestChime
} from '../lib/media-capture';
import { TelemetryStats, LatencyDataPoint } from '../lib/diagnostics';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioInputDevices: MediaDeviceInfoItem[];
  audioOutputDevices: MediaDeviceInfoItem[];
  selectedAudioDeviceId: string;
  selectedAudioOutputDeviceId: string;
  onSelectAudioInputDevice: (deviceId: string) => void;
  onSelectAudioOutputDevice: (deviceId: string) => void;
  isNoiseSuppressionEnabled: boolean;
  onToggleNoiseSuppression: (enabled: boolean) => void;
  videoInputDevices: MediaDeviceInfoItem[];
  selectedVideoDeviceId: string;
  onSelectVideoInputDevice: (deviceId: string) => void;
  selectedResolution: VideoResolution;
  onSelectResolution: (resolution: VideoResolution) => void;
  previewStream?: MediaStream | null;
  telemetry: TelemetryStats;
  latencyHistory: LatencyDataPoint[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  audioInputDevices,
  audioOutputDevices,
  selectedAudioDeviceId,
  selectedAudioOutputDeviceId,
  onSelectAudioInputDevice,
  onSelectAudioOutputDevice,
  isNoiseSuppressionEnabled,
  onToggleNoiseSuppression,
  videoInputDevices,
  selectedVideoDeviceId,
  onSelectVideoInputDevice,
  selectedResolution,
  onSelectResolution,
  previewStream,
  telemetry,
  latencyHistory
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'diagnostics'>('audio');
  const [isPlayingTestChime, setIsPlayingTestChime] = useState(false);
  const [audioInputLevel, setAudioInputLevel] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mount preview video element
  useEffect(() => {
    if (videoPreviewRef.current && previewStream && previewStream.getVideoTracks().length > 0) {
      videoPreviewRef.current.srcObject = previewStream;
    }
  }, [previewStream, activeTab]);

  // Audio level meter for the selected microphone
  useEffect(() => {
    if (!isOpen || activeTab !== 'audio' || !previewStream || previewStream.getAudioTracks().length === 0) {
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(previewStream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioInputLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        ctx.close().catch(() => {});
      };
    } catch {
      // Audio level meter fallback
    }
  }, [isOpen, activeTab, previewStream]);

  // Draw real-time Canvas latency sparkline graph
  useEffect(() => {
    if (!isOpen || activeTab !== 'diagnostics') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background subtle gridlines
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.1)';

    const maxLatencyDisplay = 250; // ms
    const gridLevels = [50, 100, 150, 200];

    gridLevels.forEach((level) => {
      const y = height - (level / maxLatencyDisplay) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
      ctx.font = '9px monospace';
      ctx.fillText(`${level}ms`, 8, y - 3);
    });

    if (latencyHistory.length < 2) {
      // Draw placeholder guide
      ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Accumulating network round-trip telemetry...', width / 2, height / 2);
      return;
    }

    // Plot RTT latency line
    const step = width / Math.max(1, latencyHistory.length - 1);

    ctx.beginPath();
    latencyHistory.forEach((pt, idx) => {
      const x = idx * step;
      const clampedRtt = Math.min(maxLatencyDisplay, Math.max(5, pt.rtt));
      const y = height - (clampedRtt / maxLatencyDisplay) * height;

      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Color determined by current RTT
    let strokeColor = '#30D158'; // Green
    if (telemetry.rtt > 160) {
      strokeColor = '#FF453A'; // Red
    } else if (telemetry.rtt > 85) {
      strokeColor = '#FF9F0A'; // Amber
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Area gradient under the line
    const lastX = (latencyHistory.length - 1) * step;
    ctx.lineTo(lastX, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${strokeColor}25`);
    gradient.addColorStop(1, `${strokeColor}00`);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Pulse dot at the latest value
    const latestPt = latencyHistory[latencyHistory.length - 1];
    const latestY = height - (Math.min(maxLatencyDisplay, Math.max(5, latestPt.rtt)) / maxLatencyDisplay) * height;
    ctx.beginPath();
    ctx.arc(lastX, latestY, 4, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, [isOpen, activeTab, latencyHistory, telemetry.rtt]);

  if (!isOpen) return null;

  const handleTestChime = async () => {
    setIsPlayingTestChime(true);
    await playAudioOutputTestChime(selectedAudioOutputDeviceId);
    setTimeout(() => setIsPlayingTestChime(false), 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-md animate-enter-smooth select-none">
      <div
        className="w-full max-w-2xl bg-white/95 dark:bg-[#121214]/95 border border-black/[0.08] dark:border-white/[0.1] rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden max-h-[94vh] sm:max-h-[90vh]"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)'
        }}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)]">
              <Sliders size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">Watchroom Settings</h2>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] truncate max-w-[200px] sm:max-w-none">
                Media pipeline, resolution & diagnostics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition cursor-pointer"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 shrink-0">
          <div className="grid grid-cols-3 p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl sm:rounded-2xl border border-black/[0.06] dark:border-white/[0.08] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 font-semibold cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-white dark:bg-white/[0.12] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Mic size={14} />
              <span>Audio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 font-semibold cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-white dark:bg-white/[0.12] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Video size={14} />
              <span className="hidden sm:inline">Video & Quality</span>
              <span className="sm:hidden">Video</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diagnostics')}
              className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 font-semibold cursor-pointer ${
                activeTab === 'diagnostics'
                  ? 'bg-white dark:bg-white/[0.12] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Activity size={14} />
              <span className="hidden sm:inline">Diagnostics</span>
              <span className="sm:hidden">Stats</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  telemetry.rtt > 160
                    ? 'bg-[#FF453A]'
                    : telemetry.rtt > 85
                    ? 'bg-[#FF9F0A]'
                    : 'bg-[#30D158]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 scrollbar-thin">
          {/* TAB 1: AUDIO SETTINGS */}
          {activeTab === 'audio' && (
            <div className="space-y-5">
              {/* Microphone Device */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  Microphone (Audio Input)
                </label>
                <div className="relative">
                  <select
                    value={selectedAudioDeviceId}
                    onChange={(e) => onSelectAudioInputDevice(e.target.value)}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] text-xs rounded-xl px-3.5 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] transition appearance-none cursor-pointer"
                  >
                    {audioInputDevices.length === 0 ? (
                      <option value="">Default System Microphone</option>
                    ) : (
                      audioInputDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Live Mic Level Indicator */}
                <div className="mt-2.5 flex items-center gap-2.5">
                  <span className="text-[10px] text-[var(--text-tertiary)] font-medium">Input Level:</span>
                  <div className="flex-1 h-1.5 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#30D158] transition-all duration-75 rounded-full"
                      style={{ width: `${audioInputLevel}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Speaker / Headphone Device */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  Speaker / Headphones (Audio Output)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedAudioOutputDeviceId}
                    onChange={(e) => onSelectAudioOutputDevice(e.target.value)}
                    className="flex-1 bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] text-xs rounded-xl px-3.5 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] transition appearance-none cursor-pointer"
                  >
                    {audioOutputDevices.length === 0 ? (
                      <option value="">Default System Output Device</option>
                    ) : (
                      audioOutputDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={handleTestChime}
                    disabled={isPlayingTestChime}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-primary)] text-xs font-semibold border border-black/[0.08] dark:border-white/[0.08] transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Play acoustic chime test"
                  >
                    <Play size={13} className={isPlayingTestChime ? 'animate-pulse text-[var(--accent)]' : ''} />
                    <span>{isPlayingTestChime ? 'Playing...' : 'Test Sound'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
                  Output routing uses standard HTML5 audio sinks. Default device is used if browser does not expose hardware routing.
                </p>
              </div>

              {/* Acoustic Enhancements */}
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)]">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">
                        Noise Suppression & Echo Cancellation
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        Filters background noise, room reverberation and prevents acoustic feedback loops
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isNoiseSuppressionEnabled}
                    onChange={(e) => onToggleNoiseSuppression(e.target.checked)}
                    className="w-4 h-4 rounded border-black/[0.08] dark:border-white/[0.08] text-[var(--accent)] focus:ring-[var(--accent)]/20 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIDEO & QUALITY SETTINGS */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              {/* Camera Selection */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  Webcam (Video Input)
                </label>
                <select
                  value={selectedVideoDeviceId}
                  onChange={(e) => onSelectVideoInputDevice(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] text-xs rounded-xl px-3.5 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] transition appearance-none cursor-pointer"
                >
                  {videoInputDevices.length === 0 ? (
                    <option value="">Default System Camera</option>
                  ) : (
                    videoInputDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Stream Resolution Cards */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Stream Quality & Resolution
                  </label>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Adjusts encoding bitrate based on your connection
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(RESOLUTION_PRESETS) as VideoResolution[]).map((res) => {
                    const preset = RESOLUTION_PRESETS[res];
                    const isSelected = selectedResolution === res;
                    return (
                      <button
                        key={res}
                        type="button"
                        onClick={() => onSelectResolution(res)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-black/[0.06] dark:bg-white/[0.1] border-black/[0.2] dark:border-white/[0.25] shadow-sm'
                            : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {preset.label}
                          </span>
                          {isSelected && <Check size={14} className="text-[var(--accent)]" />}
                        </div>
                        <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          {preset.recommendedFor}
                        </span>
                        <div className="mt-2 text-[10px] font-mono text-[var(--text-tertiary)]">
                          {preset.width}x{preset.height} @ {preset.frameRate}fps (Max {Math.round(preset.maxBitrate / 1000)} Kbps)
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Mirror Preview */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  Camera Feed Preview ({RESOLUTION_PRESETS[selectedResolution].width}x
                  {RESOLUTION_PRESETS[selectedResolution].height})
                </label>
                <div className="w-full aspect-video rounded-2xl bg-black overflow-hidden relative flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1]">
                  {previewStream && previewStream.getVideoTracks().length > 0 ? (
                    <video
                      ref={(el) => {
                        videoPreviewRef.current = el;
                        if (el && previewStream) {
                          if (el.srcObject !== previewStream) {
                            el.srcObject = previewStream;
                          }
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="text-xs text-white/50 flex flex-col items-center gap-1.5">
                      <Video size={24} className="text-white/30" />
                      <span>Camera is currently off</span>
                    </div>
                  )}
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] text-white/80 font-mono">
                    Preset: {selectedResolution} ({RESOLUTION_PRESETS[selectedResolution].width}x{RESOLUTION_PRESETS[selectedResolution].height})
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS & TELEMETRY */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              {/* Smart Diagnosis Advisor Banner */}
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                  telemetry.status === 'healthy'
                    ? 'bg-[#30D158]/10 border-[#30D158]/20 text-[#30D158]'
                    : telemetry.status === 'network_bottleneck'
                    ? 'bg-[#FF9F0A]/10 border-[#FF9F0A]/20 text-[#FF9F0A]'
                    : 'bg-[#FF453A]/10 border-[#FF453A]/20 text-[#FF453A]'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {telemetry.status === 'healthy' ? (
                    <Wifi size={16} />
                  ) : (
                    <Activity size={16} />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-0.5 text-[var(--text-primary)]">
                    {telemetry.verdict}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {telemetry.recommendation}
                  </p>
                </div>
              </div>

              {/* Real-time Latency Sparkline Graph */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-[var(--text-secondary)]" />
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                      Live Latency Trend (Last 30 Seconds)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-[var(--text-tertiary)]">
                      RTT: <strong className="text-[var(--text-primary)]">{telemetry.rtt}ms</strong>
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                      Jitter: <strong className="text-[var(--text-primary)]">{telemetry.jitter}ms</strong>
                    </span>
                  </div>
                </div>

                <div className="w-full bg-black/[0.03] dark:bg-black/60 rounded-2xl p-3 border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={130}
                    className="w-full h-[130px] block"
                  />
                </div>
              </div>

              {/* 4-Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold block mb-1">
                    Ping / RTT
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--text-primary)]">
                    {telemetry.rtt} <span className="text-[10px] font-normal text-[var(--text-secondary)]">ms</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold block mb-1">
                    Jitter
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--text-primary)]">
                    {telemetry.jitter} <span className="text-[10px] font-normal text-[var(--text-secondary)]">ms</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold block mb-1">
                    Packet Loss
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--text-primary)]">
                    {telemetry.packetLoss} <span className="text-[10px] font-normal text-[var(--text-secondary)]">%</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold block mb-1">
                    Active Bitrate
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--text-primary)]">
                    {telemetry.downstreamKbps > 0 ? telemetry.downstreamKbps : telemetry.upstreamKbps}{' '}
                    <span className="text-[10px] font-normal text-[var(--text-secondary)]">Kbps</span>
                  </span>
                </div>
              </div>

              {/* System & CPU Load Estimation */}
              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={15} className="text-[var(--text-secondary)]" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      System & CPU Responsiveness
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    {telemetry.systemLoad}% Load
                  </span>
                </div>

                <div className="w-full h-2 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      telemetry.systemLoad > 65
                        ? 'bg-[#FF453A]'
                        : telemetry.systemLoad > 35
                        ? 'bg-[#FF9F0A]'
                        : 'bg-[#30D158]'
                    }`}
                    style={{ width: `${telemetry.systemLoad}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-1">
                  <span>Hardware Cores: {telemetry.cpuCores} Logical Processors</span>
                  {telemetry.memoryUsedMb && (
                    <span>JS Memory: ~{telemetry.memoryUsedMb} MB</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Changes are applied immediately without dropping your peer connection
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
