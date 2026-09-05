import React from 'react';
import { CheckCircle2, X, MonitorPlay, AlertTriangle } from 'lucide-react';

interface DrmGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DrmGuideModal: React.FC<DrmGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl relative text-[#1D1D1F] dark:text-[#F5F5F7] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#FF9F0A]/15 text-[#FF9F0A]">
            <MonitorPlay size={24} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">Streaming Hotstar, Netflix, or Prime?</h3>
            <p className="text-xs text-black/60 dark:text-white/60">Fix black screen video when sharing DRM-protected tabs</p>
          </div>
        </div>

        {/* Why this happens card */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 mb-4 leading-relaxed space-y-1.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <span className="font-bold">Why the screen turns black (Widevine L1 vs L3): </span>
              Streaming platforms like Disney+ Hotstar, Netflix, and Amazon Prime Video negotiate Widevine L1 DRM when Hardware Acceleration is active. In L1 mode, video is decoded directly in the GPU hardware enclave, and the operating system sets a hardware protection flag on the window, replacing captured frames with pure black pixels.
            </div>
          </div>
          <div className="text-[11px] text-amber-800/90 dark:text-amber-300/90 pl-6">
            When hardware acceleration is off for the video source, Widevine drops to L3 software memory decryption, allowing clean capture without black screens.
          </div>
        </div>

        {/* Method 1 (Recommended): Dual-Profile / Browser Isolation */}
        <div className="p-3.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-xs mb-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[var(--accent)]">
            <span className="px-1.5 py-0.5 rounded bg-[var(--accent)] text-black text-[10px] font-bold">Method 1 (Recommended)</span>
            <span>Dual-Browser / Profile Setup (120fps GPU Performance)</span>
          </div>
          <p className="text-black/75 dark:text-white/75 text-[11px] leading-relaxed">
            Run the movie player (Netflix, Hotstar, Prime) in a secondary browser window or separate profile (such as Firefox, Edge, or a secondary Chrome profile) with Hardware Acceleration <strong>OFF</strong>. Run SynCine in your primary browser with Hardware Acceleration <strong>ON</strong>.
          </p>
          <div className="p-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] text-[11px] text-black/70 dark:text-white/70">
            <strong>Why this is best:</strong> SynCine retains full 120fps GPU performance, smooth camera tiles, and reactive Ambilight glow, while the movie stream is captured with zero black screen.
          </div>
        </div>

        {/* Method 2: Global Browser Toggle */}
        <div className="mb-4">
          <div className="flex items-center gap-2 font-bold text-xs mb-2 text-[#1D1D1F] dark:text-[#F5F5F7]">
            <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px] font-bold">Method 2</span>
            <span>Quick Global Browser Toggle</span>
          </div>

          <div className="space-y-2.5">
            <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="text-xs">
                <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Open Browser Settings</div>
                <div className="text-black/60 dark:text-white/60 text-[11px]">
                  Navigate to <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono font-bold">chrome://settings/system</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="text-xs">
                <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Turn Off Hardware Acceleration</div>
                <div className="text-black/60 dark:text-white/60 text-[11px]">
                  Toggle "Use graphics acceleration when available" to <strong className="text-[#FF453A]">OFF</strong> and click <strong>Relaunch</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Sharing vs Window Selection */}
        <div className="p-3 rounded-xl bg-[#30D158]/10 border border-[#30D158]/20 text-xs text-[#30D158] dark:text-[#30D158] mb-4 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Always Choose "Chrome Tab" Instead of "Window"</span>
          </div>
          <p className="text-black/70 dark:text-white/70 text-[11px] leading-relaxed pl-5">
            Tab capture reads directly from the internal browser compositor with pixel-perfect alignment and native tab audio loopback. Sharing an entire Window relies on OS window capture, which can drop frames or freeze if the window is resized or minimized.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-sm text-center"
          >
            I Understand, Continue
          </button>
        </div>
      </div>
    </div>
  );
};
