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
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 mb-4 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <span className="font-bold">Why the screen turns black: </span>
            Streaming services like Disney+ Hotstar, Netflix, and Amazon Prime Video use Widevine DRM with hardware video decoding (HDCP). When screen capture is triggered, your GPU automatically blacks out the video frames to protect copyrighted content.
          </div>
        </div>

        {/* 3 Step Solution */}
        <h4 className="text-xs uppercase font-bold tracking-wider text-black/45 dark:text-white/45 mb-2.5">
          The 10-Second Fix (Chrome, Brave, Edge)
        </h4>

        <div className="space-y-3 mb-5">
          <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div className="text-xs">
              <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Open Browser Settings</div>
              <div className="text-black/60 dark:text-white/60 mt-0.5 font-mono text-[11px]">
                Type <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold">chrome://settings/system</span> in your address bar
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div className="text-xs">
              <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Turn Off Graphics / Hardware Acceleration</div>
              <div className="text-black/60 dark:text-white/60 mt-0.5">
                Toggle <span className="font-medium">"Use graphics acceleration when available"</span> (or Hardware Acceleration) to <strong className="text-[#FF453A]">OFF</strong>.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div className="text-xs">
              <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Click Relaunch</div>
              <div className="text-black/60 dark:text-white/60 mt-0.5">
                Relaunch your browser. Hotstar and Netflix tabs will now share with full, crisp video and clear audio.
              </div>
            </div>
          </div>
        </div>

        {/* Tip for tab sharing vs full screen */}
        <div className="p-3 rounded-xl bg-[#30D158]/10 border border-[#30D158]/20 text-xs text-[#30D158] dark:text-[#30D158] mb-5 flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Pro Tip: When sharing, choose <strong>"Chrome Tab"</strong> and check <strong>"Also share tab audio"</strong> for optimal sync!</span>
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
