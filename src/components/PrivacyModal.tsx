import React from 'react';
import { SynLogo } from './icons/SynIcons';
import { X, ShieldCheck, Lock, EyeOff, ServerOff, Database } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xl animate-enter-smooth"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0C0C0D] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-5 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <SynLogo size={26} className="sm:w-7 sm:h-7" />
            <div>
              <h2 id="privacy-modal-title" className="text-sm font-semibold text-[var(--text-primary)]">
                Privacy Policy
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)]">
                Effective Date: September 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Close privacy policy"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 text-xs text-[var(--text-secondary)] leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
              <ServerOff size={16} className="text-[var(--accent)]" />
              <h3>1. Zero Server Video Storage</h3>
            </div>
            <p>
              SynCine is built from the ground up on private peer-to-peer (P2P) WebRTC architecture. Your video playback streams, microphone audio, and camera feeds travel directly between connected participants through end-to-end encrypted SRTP channels. At no point is video or audio content uploaded, transcoded, recorded, or stored on our servers or third-party cloud infrastructure.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
              <Lock size={16} className="text-[var(--accent)]" />
              <h3>2. Ephemeral Signaling Data</h3>
            </div>
            <p>
              To establish direct peer connections between browsers, minimal signaling metadata (WebRTC Session Description Protocol offers, answers, and ICE network candidates) is relayed through our database. This metadata contains no media content and is automatically purged on a continuous 10-minute cleanup lifecycle.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
              <EyeOff size={16} className="text-[var(--accent)]" />
              <h3>3. Anonymous Access & Guest Sessions</h3>
            </div>
            <p>
              Joining and hosting watchrooms does not require registration, personal email addresses, phone numbers, or social media linking. Default guest watchrooms are assigned an automatic 3-hour expiration buffer. Once expired, all associated room identifiers and signaling states are completely eliminated.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
              <Database size={16} className="text-[var(--accent)]" />
              <h3>4. Local Storage & Zero Advertising Trackers</h3>
            </div>
            <p>
              SynCine does not use third-party advertising networks, cross-site trackers, or behavioral profiling cookies. We strictly utilize client-side <code className="px-1 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06]">localStorage</code> to remember your display name and your visual theme preference (dark, light, or automatic time-of-day mode).
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
              <ShieldCheck size={16} className="text-[var(--accent)]" />
              <h3>5. User Rights & Data Protection</h3>
            </div>
            <p>
              In full compliance with international privacy regulations including GDPR and CCPA, you retain complete rights to your data. Since we store no persistent personal data for guest users, no profile exists to disclose. For registered hosts, account deletion is available at any time upon request.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0 text-xs text-[var(--text-tertiary)]">
          <span>SynCine Privacy & Security</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-primary)] font-medium rounded-xl transition cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
