import React, { useState, useEffect } from 'react';
import { SynLogo } from './icons/SynIcons';
import { RotateCcw, Home, Clock } from 'lucide-react';
import { formatRoomCode } from '../lib/appwrite';

interface RejoinBufferProps {
  roomId: string;
  roomName?: string;
  onRejoin: () => void;
  onReturnHome: () => void;
}

const TOTAL_BUFFER_SECONDS = 30;

export const RejoinBuffer: React.FC<RejoinBufferProps> = ({
  roomId,
  roomName = 'Watchroom',
  onRejoin,
  onReturnHome
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(TOTAL_BUFFER_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReturnHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onReturnHome]);

  // Keyboard hotkeys: Enter to Rejoin, Esc to Return Home
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onRejoin();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onReturnHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRejoin, onReturnHome]);

  const progressPercent = (secondsRemaining / TOTAL_BUFFER_SECONDS) * 100;
  const strokeDashoffset = 283 - (283 * progressPercent) / 100;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 select-none z-20 animate-enter-smooth">
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <SynLogo size={28} />
          <span className="text-[var(--text-primary)] font-bold text-base tracking-tight">SynCine</span>
        </div>
      </header>

      {/* Center Buffer Card */}
      <main className="w-full max-w-md my-auto">
        <div className="p-6 sm:p-8 rounded-3xl realistic-glass border border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col items-center text-center">
          {/* Circular Countdown Ring */}
          <div className="relative w-28 h-28 mb-5 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-black/[0.06] dark:stroke-white/[0.08]"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-[var(--accent)] transition-all duration-1000 ease-linear"
                strokeWidth="6"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-mono font-bold text-[var(--text-primary)] leading-none">
                {secondsRemaining}s
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mt-1 font-semibold">
                Buffer
              </span>
            </div>
          </div>

          <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-1">
            Session Ended
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-1">
            You left the watchroom
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            {roomName} • <span className="font-mono">{formatRoomCode(roomId)}</span>
          </p>

          <div className="w-full p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] mb-6 text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
            <Clock size={14} className="text-[var(--text-tertiary)]" />
            <span>Quick Rejoin is active for {secondsRemaining} seconds</span>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5">
            <button
              type="button"
              onClick={onRejoin}
              className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-semibold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01]"
            >
              <RotateCcw size={15} />
              <span>Rejoin Watchroom</span>
            </button>

            <button
              type="button"
              onClick={onReturnHome}
              className="w-full py-3 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home size={15} />
              <span>Return to Home</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl py-4 text-center text-xs text-[var(--text-tertiary)]">
        Press <kbd className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] font-mono text-[10px]">Enter</kbd> to rejoin or <kbd className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] font-mono text-[10px]">Esc</kbd> to return home
      </footer>
    </div>
  );
};
