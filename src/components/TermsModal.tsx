import React from 'react';
import { SynLogo } from './icons/SynIcons';
import { X, FileText, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xl animate-enter-smooth"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0C0C0D] border border-black/[0.08] dark:border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <SynLogo size={28} />
            <div>
              <h2 id="terms-modal-title" className="text-sm font-semibold text-[var(--text-primary)]">
                Terms of Service
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Last updated: September 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Close terms of service"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
              <FileText size={16} className="text-[var(--accent)]" />
              <h3>1. Platform Service Purpose</h3>
            </div>
            <p>
              SynCine provides real-time peer-to-peer browser synchronization tooling that enables users to coordinate video playback and communicate over WebRTC with friends. SynCine does not provide, host, sell, or index copyrighted video files or streaming media.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
              <CheckCircle2 size={16} className="text-[var(--accent)]" />
              <h3>2. User Content & Copyright Responsibility</h3>
            </div>
            <p>
              When streaming through Screen Cast or Local File Sync, you are solely responsible for ensuring you have the legal right, authorization, or license to view and share the media with your invited room participants. SynCine operates as an encrypted conduit and cannot view, verify, or filter peer media streams.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
              <AlertCircle size={16} className="text-[var(--accent)]" />
              <h3>3. Acceptable Use Policy</h3>
            </div>
            <p>
              Users agree not to exploit SynCine for malicious purposes, including distributing malicious software, engaging in unauthorized network sniffing, transmitting non-consensual imagery, or attempting to compromise signaling infrastructure.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
              <HelpCircle size={16} className="text-[var(--accent)]" />
              <h3>4. Disclaimers & Limitation of Liability</h3>
            </div>
            <p>
              The platform is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis without warranties of uninterrupted availability. To the maximum extent permitted by applicable law, SynCine and its developers shall not be liable for any indirect or consequential damages arising from service usage.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0 text-xs text-[var(--text-tertiary)]">
          <span>SynCine Terms of Use</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-primary)] font-medium rounded-xl transition cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};
