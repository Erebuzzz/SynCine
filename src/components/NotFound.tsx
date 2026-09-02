import React from 'react';
import { SynLogo } from './icons/SynIcons';
import { ArrowLeft } from 'lucide-react';

interface NotFoundProps {
  onReturnHome: () => void;
  message?: string;
}

export const NotFound: React.FC<NotFoundProps> = ({
  onReturnHome,
  message = 'The requested watchroom or page could not be located.'
}) => {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-black font-sans select-none z-10 relative">
      <div className="max-w-md p-8 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col items-center">
        <SynLogo size={44} className="mb-4" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent)] mb-1">
          404 Error
        </span>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Page Not Found
        </h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
          {message}
        </p>
        <button
          onClick={onReturnHome}
          className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Return to Watchrooms</span>
        </button>
      </div>
    </main>
  );
};
