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
  ShieldCheck,
  Command,
  MonitorPlay,
  FlipHorizontal,
  Pin,
  MessageSquare,
  Smile,
  Shield,
  Copy,
  Sparkles,
  Moon,
  Sun,
  Zap,
  Volume2,
  Subtitles
} from 'lucide-react';
import {
  VideoResolution,
  RESOLUTION_PRESETS,
  MediaDeviceInfoItem,
  playAudioOutputTestChime
} from '../lib/media-capture';
import { TelemetryStats, LatencyDataPoint } from '../lib/diagnostics';
import { DialogueBoostLevel } from '../lib/audio-processing';
import { ThemeMode, getSavedThemeMode, setSavedThemeMode } from '../lib/time-cycle';
import { applyPerformanceMode, isSoftwareRenderingDetected } from '../lib/performance-detect';
import {
  BLUR_PRESETS,
  MAX_BLUR_RADIUS,
  getStoredBlurRadius,
  setStoredBlurRadius
} from '../lib/background-blur';
import { DrmGuideModal } from './DrmGuideModal';

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
  telemetry?: TelemetryStats;
  latencyHistory?: LatencyDataPoint[];
  isCameraMirrored?: boolean;
  onToggleCameraMirror?: (mirrored: boolean) => void;
  bgBlurRadius?: number;
  onSetBlurRadius?: (radius: number) => void;
  isAmbilightEnabled?: boolean;
  onToggleAmbilight?: (enabled: boolean) => void;
  dialogueBoost?: DialogueBoostLevel;
  onSelectDialogueBoost?: (level: DialogueBoostLevel) => void;
  nightMode?: boolean;
  onToggleNightMode?: (enabled: boolean) => void;
  themeMode?: ThemeMode;
  onSetThemeMode?: (mode: ThemeMode) => void;
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
  telemetry = {
    rtt: 0,
    jitter: 0,
    packetLoss: 0,
    downstreamKbps: 0,
    upstreamKbps: 0,
    systemLoad: 5,
    cpuCores: typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4,
    memoryUsedMb: null,
    memoryLimitMb: null,
    status: 'healthy',
    verdict: 'Optimal Configuration',
    recommendation: 'Ready to stream.'
  },
  latencyHistory = [],
  isCameraMirrored = false,
  onToggleCameraMirror,
  bgBlurRadius: propBlurRadius,
  onSetBlurRadius,
  isAmbilightEnabled: propAmbilight,
  onToggleAmbilight,
  dialogueBoost: propDialogueBoost,
  onSelectDialogueBoost,
  nightMode: propNightMode,
  onToggleNightMode,
  themeMode: propThemeMode,
  onSetThemeMode
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'cinema' | 'shortcuts' | 'diagnostics'>('audio');
  const [localThemeMode, setLocalThemeMode] = useState<ThemeMode>(() => getSavedThemeMode());
  const effectiveThemeMode = propThemeMode ?? localThemeMode;
  const [localBlurRadius, setLocalBlurRadius] = useState<number>(() => getStoredBlurRadius());
  const effectiveBlurRadius = propBlurRadius !== undefined ? propBlurRadius : localBlurRadius;

  useEffect(() => {
    if (isOpen) {
      setLocalBlurRadius(propBlurRadius !== undefined ? propBlurRadius : getStoredBlurRadius());
    }
  }, [isOpen, propBlurRadius]);

  const [isPerformanceMode, setIsPerformanceMode] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('software-rendering') || isSoftwareRenderingDetected();
    }
    return false;
  });
  const [localAmbilight, setLocalAmbilight] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syncine-ambilight') !== 'false';
    }
    return true;
  });
  const [localDialogueBoost, setLocalDialogueBoost] = useState<DialogueBoostLevel>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('syncine-dialogue-boost') as DialogueBoostLevel) || 'off';
    }
    return 'off';
  });
  const [localNightMode, setLocalNightMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syncine-night-mode') === 'true';
    }
    return false;
  });

  const effectiveAmbilight = propAmbilight !== undefined ? propAmbilight : localAmbilight;
  const effectiveDialogueBoost = propDialogueBoost !== undefined ? propDialogueBoost : localDialogueBoost;
  const effectiveNightMode = propNightMode !== undefined ? propNightMode : localNightMode;

  const handleToggleAmbilight = (val: boolean) => {
    setLocalAmbilight(val);
    if (onToggleAmbilight) onToggleAmbilight(val);
    if (typeof window !== 'undefined') localStorage.setItem('syncine-ambilight', val ? 'true' : 'false');
  };

  const handleSelectDialogueBoost = (level: DialogueBoostLevel) => {
    setLocalDialogueBoost(level);
    if (onSelectDialogueBoost) onSelectDialogueBoost(level);
    if (typeof window !== 'undefined') localStorage.setItem('syncine-dialogue-boost', level);
  };

  const handleToggleNightMode = (val: boolean) => {
    setLocalNightMode(val);
    if (onToggleNightMode) onToggleNightMode(val);
    if (typeof window !== 'undefined') localStorage.setItem('syncine-night-mode', val ? 'true' : 'false');
  };

  const handleSelectThemeMode = (mode: ThemeMode) => {
    setLocalThemeMode(mode);
    setSavedThemeMode(mode);
    if (onSetThemeMode) {
      onSetThemeMode(mode);
    } else if (typeof document !== 'undefined') {
      const dark = mode === 'dark' || (mode === 'auto' && (new Date().getHours() < 6 || new Date().getHours() >= 18.5));
      if (dark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  };

  const handleTogglePerformance = (val: boolean) => {
    setIsPerformanceMode(val);
    applyPerformanceMode(val);
  };

  const handleSelectBlurRadius = (val: number) => {
    setLocalBlurRadius(val);
    setStoredBlurRadius(val);
    if (onSetBlurRadius) {
      onSetBlurRadius(val);
    }
  };

  const [isPlayingTestChime, setIsPlayingTestChime] = useState(false);
  const [audioInputLevel, setAudioInputLevel] = useState(0);
  const [isDrmGuideOpen, setIsDrmGuideOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mount preview video element with video-only stream to guarantee autoplay
  useEffect(() => {
    const video = videoPreviewRef.current;
    if (!video) return;

    let videoTrack: MediaStreamTrack | null = null;
    let attemptPlay: (() => void) | null = null;

    if (isOpen && activeTab === 'video' && previewStream && previewStream.getVideoTracks().length > 0) {
      videoTrack = previewStream.getVideoTracks()[0];
      video.defaultMuted = true;
      video.muted = true;
      const videoOnly = new MediaStream([videoTrack]);
      video.srcObject = videoOnly;

      attemptPlay = () => {
        video.play().catch(() => {});
      };
      video.onloadedmetadata = attemptPlay;
      attemptPlay();

      videoTrack.addEventListener('unmute', attemptPlay);
    } else {
      video.srcObject = null;
    }

    return () => {
      if (video) {
        video.onloadedmetadata = null;
      }
      if (videoTrack && attemptPlay) {
        videoTrack.removeEventListener('unmute', attemptPlay);
      }
    };
  }, [isOpen, activeTab, previewStream]);

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
          <div className="grid grid-cols-5 p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl sm:rounded-2xl border border-black/[0.06] dark:border-white/[0.08] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-1 sm:gap-1.5 font-semibold cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-white dark:bg-white/[0.12] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Mic size={13} />
              <span className="hidden sm:inline">Audio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-1 sm:gap-1.5 font-semibold cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-white dark:bg-white/[0.12] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Video size={13} />
              <span className="hidden sm:inline">Video</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cinema')}
              className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-1 sm:gap-1.5 font-semibold cursor-pointer ${
                activeTab === 'cinema'
                  ? 'bg-white dark:bg-white/[0.12] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Sparkles size={13} className={activeTab === 'cinema' ? 'text-amber-400' : ''} />
              <span className="hidden sm:inline">Cinema</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shortcuts')}
              className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 font-semibold cursor-pointer ${
                activeTab === 'shortcuts'
                  ? 'bg-white dark:bg-white/[0.12] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Command size={14} />
              <span className="hidden sm:inline">Shortcuts</span>
              <span className="sm:hidden">Keys</span>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Camera Feed Preview ({RESOLUTION_PRESETS[selectedResolution].width}x
                    {RESOLUTION_PRESETS[selectedResolution].height})
                  </label>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {isCameraMirrored ? 'Mirrored' : 'Natural (Unmirrored)'}
                  </span>
                </div>

                <div className="w-full aspect-video rounded-2xl bg-black overflow-hidden relative flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1]">
                  {previewStream && previewStream.getVideoTracks().length > 0 ? (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        isCameraMirrored ? 'scale-x-[-1]' : ''
                      }`}
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

              {/* Flip Camera Horizontally (Mirror Mode) */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-[var(--text-primary)]">
                    Flip Camera Horizontally (Mirror Mode)
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Flips your webcam view horizontally for yourself and all watchroom viewers
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleCameraMirror?.(!isCameraMirrored)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    isCameraMirrored ? 'bg-[var(--accent)]' : 'bg-black/20 dark:bg-white/20'
                  }`}
                  title="Toggle horizontal mirror"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                      isCameraMirrored ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Background Blur & Portrait Bokeh */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)]">
                      <Sparkles size={15} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-[var(--text-primary)]">
                        Background Blur & Portrait Bokeh
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        Sub-pixel edge feathering with real-time subject segmentation
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                      effectiveBlurRadius > 0
                        ? 'bg-[var(--accent)] text-black'
                        : 'bg-black/[0.06] dark:bg-white/[0.08] text-[var(--text-tertiary)]'
                    }`}
                  >
                    {effectiveBlurRadius === 0 ? 'Off' : `${effectiveBlurRadius}px`}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Off', val: BLUR_PRESETS.OFF, desc: 'Raw feed' },
                    { label: 'Subtle', val: BLUR_PRESETS.SUBTLE, desc: '8px' },
                    { label: 'Portrait', val: BLUR_PRESETS.PORTRAIT, desc: '16px' },
                    { label: 'Deep', val: BLUR_PRESETS.DEEP, desc: '24px' }
                  ].map((preset) => {
                    const isSelected = effectiveBlurRadius === preset.val;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSelectBlurRadius(preset.val)}
                        className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[var(--accent)] text-black border-transparent font-bold shadow-sm'
                            : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] text-[var(--text-secondary)] hover:border-black/[0.15] dark:hover:border-white/[0.15]'
                        }`}
                      >
                        <span className="text-xs">{preset.label}</span>
                        <span
                          className={`text-[9px] mt-0.5 ${
                            isSelected ? 'text-black/70' : 'text-[var(--text-tertiary)]'
                          }`}
                        >
                          {preset.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Continuous Blur Intensity Slider */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-tertiary)] font-medium">Fine-tune Blur Radius</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {effectiveBlurRadius}px / {MAX_BLUR_RADIUS}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={MAX_BLUR_RADIUS}
                    value={effectiveBlurRadius}
                    onChange={(e) => handleSelectBlurRadius(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-black/[0.08] dark:bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                </div>

                <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
                  Off mode completely bypasses model inference to ensure zero CPU/GPU overhead.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CINEMA & AUDIO ENHANCEMENTS */}
          {activeTab === 'cinema' && (
            <div className="space-y-5 animate-enter-smooth">
              {/* Dynamic Cinema Ambilight Glow */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={16} className="text-amber-400" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Dynamic Cinema Ambilight Glow
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    Samples edge frames in real time and diffuses a soft ambient glow behind the cinema player to reduce eye fatigue and heighten immersion.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAmbilight(!effectiveAmbilight)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    effectiveAmbilight ? 'bg-[var(--accent)]' : 'bg-black/20 dark:bg-white/20'
                  }`}
                  title="Toggle Cinema Ambilight"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                      effectiveAmbilight ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Speech Clarity (Dialogue Booster) */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-[var(--accent)]" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Speech Clarity EQ (Dialogue Booster)
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)]">Peaking EQ (2.5 kHz)</span>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] mb-3 leading-relaxed">
                  Applies a Web Audio equalizer curve targeted at speech consonant frequencies so actor voices remain crystal clear even over booming movie soundtracks.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'off', label: 'Off', desc: 'Natural sound mix' },
                      { id: 'medium', label: 'Medium', desc: '+3.5 dB speech lift' },
                      { id: 'high', label: 'High', desc: '+6.0 dB vocal isolation' }
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectDialogueBoost(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        effectiveDialogueBoost === opt.id
                          ? 'bg-black/[0.06] dark:bg-white/[0.1] border-[var(--accent)] text-[var(--text-primary)] shadow-sm'
                          : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] text-[var(--text-secondary)] hover:border-black/[0.12] dark:hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold">{opt.label}</span>
                        {effectiveDialogueBoost === opt.id && <Check size={13} className="text-[var(--accent)]" />}
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)] leading-tight block">
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Night Mode Dynamics Compression */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Moon size={16} className="text-indigo-400" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Night Mode (Dynamic Range Compression)
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    Studio dynamics compressor that automatically cushions sudden loud explosions and action sequences while softly raising whisper volumes for late-night viewing.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNightMode(!effectiveNightMode)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    effectiveNightMode ? 'bg-[var(--accent)]' : 'bg-black/20 dark:bg-white/20'
                  }`}
                  title="Toggle Night Mode Compression"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                      effectiveNightMode ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Real-Time Theme Mode */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sun size={16} className="text-amber-500" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Real-Time Day / Night Theme
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                    {effectiveThemeMode === 'auto' ? 'Clock Synchronized' : 'Manual'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] mb-3 leading-relaxed">
                  Automatic mode dynamically shifts to clean Light theme during daylight hours (06:00 to 18:30) and switches to OLED Cinema Black at night.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'auto', label: 'Auto (Real-Time)', desc: 'Follows daylight clock' },
                      { id: 'light', label: 'Light', desc: 'Always daylight' },
                      { id: 'dark', label: 'Dark', desc: 'Always cinema black' }
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectThemeMode(opt.id as ThemeMode)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        effectiveThemeMode === opt.id
                          ? 'bg-black/[0.06] dark:bg-white/[0.1] border-[var(--accent)] text-[var(--text-primary)] shadow-sm'
                          : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] text-[var(--text-secondary)] hover:border-black/[0.12] dark:hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold">{opt.label}</span>
                        {effectiveThemeMode === opt.id && <Check size={13} className="text-[var(--accent)]" />}
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)] leading-tight block">
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Performance Mode (Zero-Lag Fallback) */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={16} className="text-amber-400" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Performance Mode (Zero-Lag Fallback)
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    Disables expensive CPU Gaussian blurs and filters. Automatically activated when browser Hardware Acceleration is disabled or on lower-end devices to guarantee smooth 60fps streaming.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePerformance(!isPerformanceMode)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    isPerformanceMode ? 'bg-[var(--accent)]' : 'bg-black/20 dark:bg-white/20'
                  }`}
                  title="Toggle Performance Mode"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                      isPerformanceMode ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Picture-in-Picture & Subtitles Quick Tip */}
              <div className="p-3.5 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center gap-3">
                <Subtitles size={18} className="text-[var(--accent)] shrink-0" />
                <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  External subtitles (.srt and .vtt) can be loaded directly from the cinema dock. Press <strong className="font-mono text-[var(--text-primary)]">V</strong> to toggle captions and <strong className="font-mono text-[var(--text-primary)]">Shift+P</strong> for Picture-in-Picture.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEYBOARD SHORTCUTS & DRM GUIDE */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              {/* Hotstar & Netflix DRM Helper Card */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
                    <MonitorPlay size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-primary)]">
                      Screen Sharing Hotstar, Netflix, or Prime?
                    </h4>
                    <p className="text-black/60 dark:text-white/60 mt-0.5 leading-relaxed">
                      If video shows a black screen with audio playing, disable Hardware Acceleration in your browser settings.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrmGuideOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-[11px] shrink-0 hover:opacity-90 transition cursor-pointer"
                >
                  View 10s Guide
                </button>
              </div>

              {/* Shortcuts Table */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-black/45 dark:text-white/45 px-1">
                  Active Keyboard Shortcuts
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'M', label: 'Mute / Unmute Microphone', icon: <Mic size={13} /> },
                    { key: 'Space', label: 'Push-to-Talk (Hold to speak)', icon: <Mic size={13} /> },
                    { key: 'O', label: 'Camera On / Off', icon: <Video size={13} /> },
                    { key: '\\', label: 'Camera Mirror Mode', icon: <FlipHorizontal size={13} /> },
                    { key: 'F', label: 'Toggle Full Screen Mode', icon: <Command size={13} /> },
                    { key: 'Esc', label: 'Exit Full Screen / Close Menus', icon: <Command size={13} /> },
                    { key: 'Shift+P', label: 'Picture-in-Picture Floating Player', icon: <MonitorPlay size={13} /> },
                    { key: 'V', label: 'Toggle Subtitles Overlay', icon: <Subtitles size={13} /> },
                    { key: 'A', label: 'Toggle Cinema Ambilight Glow', icon: <Sparkles size={13} /> },
                    { key: 'P', label: 'Pin / Unpin Active Feed', icon: <Pin size={13} /> },
                    { key: 'S', label: 'Open Settings & Diagnostics', icon: <Sliders size={13} /> },
                    { key: 'R', label: 'Open Emoji Reactions Tray', icon: <Smile size={13} /> },
                    { key: 'C', label: 'Toggle Room Chat Sidebar', icon: <MessageSquare size={13} /> },
                    { key: 'H', label: 'Host Controls (Host Only)', icon: <Shield size={13} /> },
                    { key: 'I', label: 'Copy Watchroom Invite Link', icon: <Copy size={13} /> },
                    { key: '?', label: 'Open Shortcuts Cheatsheet', icon: <Command size={13} /> }
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] text-xs"
                    >
                      <div className="flex items-center gap-2 text-black/80 dark:text-white/80">
                        <span className="text-black/45 dark:text-white/45">{item.icon}</span>
                        <span className="truncate max-w-[180px]">{item.label}</span>
                      </div>
                      <kbd className="px-2 py-0.5 rounded-lg bg-black/[0.06] dark:bg-white/[0.1] border border-black/10 dark:border-white/10 font-mono text-[11px] font-bold text-[var(--accent)] shrink-0">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-black/45 dark:text-white/45 text-center pt-1">
                Shortcuts are automatically paused while typing in text inputs or the chat box.
              </div>
            </div>
          )}

          {/* TAB 4: DIAGNOSTICS & TELEMETRY */}
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

      <DrmGuideModal
        isOpen={isDrmGuideOpen}
        onClose={() => setIsDrmGuideOpen(false)}
      />
    </div>
  );
};
