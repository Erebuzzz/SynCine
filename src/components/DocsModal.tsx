import React, { useState } from 'react';
import { SynLogo, MeshNetworkIcon, LatencySyncIcon, ScreenCastIcon } from './icons/SynIcons';
import { X, Shield, Clock, HardDrive, Cpu, Terminal } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'architecture' | 'sync' | 'lifecycle' | 'privacy'>('architecture');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="docs-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/85 backdrop-blur-xl animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0A0A0A] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <SynLogo size={28} />
            <div>
              <div className="flex items-center gap-2">
                <h2 id="docs-modal-title" className="text-sm font-semibold text-[var(--text-primary)]">
                  System Architecture & Technical Specification
                </h2>
                <span className="font-mono text-[10px] text-[var(--text-tertiary)] hidden sm:inline">
                  [SPEC_V1.0]
                </span>
              </div>
              <p className="font-mono text-[11px] text-[var(--text-secondary)]">
                WebRTC mesh topology, drift compensation, and ephemeral buffer lifecycle
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Close documentation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section Tabs (Monospace Numbered) */}
        <div className="flex px-6 pt-3 border-b border-black/[0.06] dark:border-white/[0.06] gap-2 shrink-0 overflow-x-auto font-mono text-xs">
          {[
            { id: 'architecture', num: '[01]', label: 'P2P MESH', icon: MeshNetworkIcon },
            { id: 'sync', num: '[02]', label: 'DRIFT ENGINE', icon: LatencySyncIcon },
            { id: 'lifecycle', num: '[03]', label: 'LIFECYCLE', icon: Clock },
            { id: 'privacy', num: '[04]', label: 'PRIVACY', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[var(--accent)] text-[var(--text-primary)] font-semibold'
                    : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <span className="text-[var(--accent)]">{tab.num}</span>
                <Icon size={13} />
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
                <div className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider mb-1">
                  // TOPOLOGY
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Full Mesh WebRTC Topology
                </h3>
                <p>
                  SynCine operates on a direct browser-to-browser WebRTC mesh network. Video and audio streams flow peer-to-peer over encrypted SRTP channels without routing through centralized media servers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold mb-1">
                    <Cpu size={14} />
                    <span>4-Peer Capacity Bound</span>
                  </div>
                  <p className="text-[11px]">
                    To maintain optimal uplink bandwidth and prevent CPU throttling on mobile devices, rooms are strictly bounded to a maximum of 4 concurrent peers.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold mb-1">
                    <ScreenCastIcon size={14} />
                    <span>Hardware H.264 Acceleration</span>
                  </div>
                  <p className="text-[11px]">
                    Screen broadcasts prefer hardware-accelerated H.264 encoding with automatic fallback to VP8 across Chrome, Safari, Firefox, Edge, and mobile browsers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'sync' && (
            <div className="space-y-4">
              <div>
                <div className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider mb-1">
                  // SYNCHRONIZATION
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Sub-350ms Drift Compensation
                </h3>
                <p>
                  Collaborative playback across distributed networks experiences variable latency. SynCine implements continuous round-trip latency benchmarking and playback rate compensation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                <div className="font-mono text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Terminal size={13} />
                  <span>SYNC ENGINE RULES</span>
                </div>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
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
                <div className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider mb-1">
                  // BUFFER POLICY
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  3-Hour Ephemeral Buffer & Permanent Vanity Rooms
                </h3>
                <p>
                  To balance frictionless zero-login access with privacy and database maintenance, rooms follow two lifecycle models:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="font-semibold text-[var(--text-primary)] mb-0.5">
                    Ephemeral Guest Rooms (Default)
                  </div>
                  <p className="text-[11px]">
                    Created instantly without credentials. An automatic 3-hour expiration buffer is provisioned upon room creation. Once elapsed, signaling and room records are purged automatically.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="font-semibold text-[var(--text-primary)] mb-0.5">
                    Permanent Vanity Rooms
                  </div>
                  <p className="text-[11px]">
                    Hosts signed in via Appwrite Auth can create permanent room URLs that remain active indefinitely for recurring group viewing sessions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-4">
              <div>
                <div className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider mb-1">
                  // PRIVACY
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Zero Cloud Video Storage Privacy
                </h3>
                <p>
                  SynCine does not store, transcode, or cache your video content on any server.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
                  <HardDrive size={15} />
                  <span>Architecture Guarantees</span>
                </div>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                  <li>
                    <strong>Local File Mode:</strong> Video files selected from your device are rendered entirely client-side via the HTML5 File API. Only playback timestamp metadata is synchronized.
                  </li>
                  <li>
                    <strong>Screen Cast Mode:</strong> Display capture is streamed peer-to-peer through encrypted WebRTC data and media channels.
                  </li>
                  <li>
                    <strong>Ephemeral Signaling:</strong> WebRTC SDP offers, answers, and ICE candidate records are protected with Document-Level Security (DLS) and purged every 10 minutes.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0 font-mono text-[11px] text-[var(--text-tertiary)]">
          <span>SYNCINE // WEBRTC PROTOCOL SPECIFICATION</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-primary)] font-medium rounded-lg transition cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
