import React, { useState } from 'react';
import { SynLogo, MeshNetworkIcon, LatencySyncIcon, ScreenCastIcon } from './icons/SynIcons';
import { X, Shield, Clock, HardDrive, Cpu, Command, MonitorPlay } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'architecture' | 'sync' | 'lifecycle' | 'privacy' | 'shortcuts'>('architecture');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="docs-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xl animate-enter-smooth"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0C0C0D] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <SynLogo size={26} className="sm:w-7 sm:h-7" />
            <div>
              <h2 id="docs-modal-title" className="text-sm font-semibold text-[var(--text-primary)]">
                System Documentation & Architecture
              </h2>
              <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] truncate max-w-[210px] sm:max-w-none">
                Technical overview of the SynCine sync engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Close documentation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex px-4 sm:px-6 pt-2.5 sm:pt-3 border-b border-black/[0.06] dark:border-white/[0.06] gap-2 shrink-0 overflow-x-auto text-xs no-scrollbar">
          {[
            { id: 'architecture', label: 'Peer Mesh Network', icon: MeshNetworkIcon },
            { id: 'sync', label: 'Drift Sync Engine', icon: LatencySyncIcon },
            { id: 'lifecycle', label: 'Room Lifecycle', icon: Clock },
            { id: 'privacy', label: 'Zero-Storage Privacy', icon: Shield },
            { id: 'shortcuts', label: 'Shortcuts & DRM', icon: Command },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`pb-3 px-2.5 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap font-medium ${
                  isActive
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          {activeSection === 'architecture' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Full Mesh WebRTC Topology
                </h3>
                <p>
                  SynCine operates on a direct browser-to-browser WebRTC mesh network. Video and audio streams flow peer-to-peer over encrypted SRTP channels without passing through centralized media relays.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold mb-1">
                    <Cpu size={15} />
                    <span>4-Peer Capacity Limit</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    To maintain optimal uplink bandwidth and prevent CPU throttling on consumer hardware, rooms are bounded to a maximum of 4 concurrent peers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold mb-1">
                    <ScreenCastIcon size={15} />
                    <span>Adaptive Codecs (VP8 Prioritized)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Camera and screen broadcasts prioritize software-safe VP8 encoding with graceful H.264 and VP9 fallbacks, guaranteeing zero driver crashes when hardware acceleration is disabled.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'sync' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Sub-350ms Drift Compensation
                </h3>
                <p>
                  Collaborative playback across distributed networks experiences variable latency. SynCine implements continuous round-trip latency benchmarking and playback rate compensation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Sync Engine Rules
                </div>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px] leading-relaxed">
                  <li>
                    <strong>Network Latency Benchmarking:</strong> The host broadcasts state packets (current timestamp, playback rate, paused status) over Appwrite Realtime.
                  </li>
                  <li>
                    <strong>Jitter Threshold:</strong> If a viewer's local playback deviates by more than 350 milliseconds from the compensated reference time, a discrete seek correction is executed.
                  </li>
                  <li>
                    <strong>Micro-Rate Smoothing:</strong> Deviations under 350ms are corrected smoothly by modulating HTML5 video playback rate between 0.98x and 1.02x to prevent audio pitch jitter.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'lifecycle' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  3-Hour Guest Buffer & Permanent Rooms
                </h3>
                <p>
                  To balance frictionless zero-login access with privacy and database maintenance, rooms follow two lifecycle models:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1">
                    Ephemeral Guest Rooms (Default)
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Created instantly without credentials. An automatic 3-hour expiration buffer is provisioned upon room creation. Once elapsed, signaling and room records are purged automatically.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1">
                    Permanent Vanity Rooms
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Hosts signed in via Appwrite Auth can create permanent room URLs that remain active indefinitely for recurring group viewing sessions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Zero Cloud Video Storage
                </h3>
                <p>
                  SynCine does not store, transcode, or cache your video content on any server.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
                  <HardDrive size={15} />
                  <span>Privacy Guarantees</span>
                </div>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px] leading-relaxed">
                  <li>
                    <strong>Local File Mode:</strong> Video files selected from your device are rendered entirely client-side via the HTML5 File API. Only playback timestamp metadata is synchronized.
                  </li>
                  <li>
                    <strong>Screen Cast Mode:</strong> Display capture is streamed peer-to-peer through encrypted WebRTC data and media channels.
                  </li>
                  <li>
                    <strong>Ephemeral Signaling:</strong> WebRTC SDP offers, answers, and ICE candidate records are protected with Document-Level Security (DLS) and purged automatically.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'shortcuts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Keyboard Shortcuts Reference
                </h3>
                <p>
                  SynCine includes desktop-class hotkeys to control your audio, video, reactions, and fullscreen stage without breaking playback immersion.
                </p>
              </div>

              {/* Shortcuts Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'M', label: 'Mute / Unmute Microphone' },
                  { key: 'Space', label: 'Push-to-Talk (Hold to speak, release to mute)' },
                  { key: 'O', label: 'Camera On / Off' },
                  { key: '\\', label: 'Camera Mirror Mode On / Off' },
                  { key: 'F', label: 'Toggle Full Screen Mode' },
                  { key: 'Esc', label: 'Exit Full Screen Mode / Close Modals' },
                  { key: 'P', label: 'Pin / Unpin Focused Video Feed' },
                  { key: 'S', label: 'Open Settings & Live Diagnostics' },
                  { key: 'R', label: 'Open Cinema Emoji Reactions Tray' },
                  { key: 'C', label: 'Toggle Room Chat Drawer' },
                  { key: 'H', label: 'Open Host Controls Panel (Host Only)' },
                  { key: 'I', label: 'Copy Watchroom Shareable Invite Link' },
                  { key: '?', label: 'Open Shortcuts Cheatsheet Modal' }
                ].map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]"
                  >
                    <span className="text-xs text-[var(--text-primary)] truncate max-w-[190px]">{s.label}</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.1] border border-black/10 dark:border-white/10 font-mono text-[11px] font-bold text-[var(--accent)] shrink-0">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>

              {/* Hotstar, Netflix & DRM Black Screen Guide */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-500 font-bold">
                  <MonitorPlay size={16} />
                  <span>Fixing Black Screen on Hotstar, Netflix, or Prime Video</span>
                </div>
                <p className="text-black/70 dark:text-white/70 leading-relaxed text-[11px]">
                  Protected streaming platforms negotiate Widevine L1 hardware encryption when GPU hardware acceleration is active. The operating system kernel enforces a hardware protection lock on the video overlay, outputting pure black pixels when captured.
                </p>
                <div className="p-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] text-[11px] leading-relaxed space-y-1">
                  <strong className="text-[var(--accent)]">Method 1 (Recommended for 120fps Performance):</strong>
                  <p className="text-black/70 dark:text-white/70">
                    Open Netflix or Hotstar in a secondary browser (such as Firefox, Edge, or a second Chrome profile) with Hardware Acceleration turned OFF so Widevine drops to L3 software memory decoding. Keep SynCine in your primary browser with Hardware Acceleration ON for full 120fps GPU performance, then share the movie tab.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] text-[11px] leading-relaxed space-y-1">
                  <strong className="text-[var(--text-primary)] font-semibold">Method 2 (Quick Global Toggle):</strong>
                  <p className="text-black/70 dark:text-white/70">
                    Open Chrome Settings (chrome://settings/system) &gt; toggle OFF "Use graphics acceleration when available" &gt; click Relaunch. SynCine automatically activates its software rendering optimizations.
                  </p>
                </div>
                <div className="text-[11px] text-black/60 dark:text-white/60">
                  <strong>Source Tip:</strong> Always choose <strong>Chrome Tab</strong> when sharing to use direct browser compositor readback with tab audio sync.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0 text-xs text-[var(--text-tertiary)]">
          <span>SynCine Architecture</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-primary)] font-medium rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
