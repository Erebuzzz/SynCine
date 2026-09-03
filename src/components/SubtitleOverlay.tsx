import React from 'react';
import { SubtitleCue, findActiveCue } from '../lib/subtitle-parser';

interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  currentTime: number;
  offsetSeconds?: number;
  fontSize?: 'sm' | 'md' | 'lg';
  isVisible?: boolean;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  cues,
  currentTime,
  offsetSeconds = 0,
  fontSize = 'md',
  isVisible = true
}) => {
  if (!isVisible || !cues || cues.length === 0) {
    return null;
  }

  const activeCue = findActiveCue(cues, currentTime, offsetSeconds);
  if (!activeCue) {
    return null;
  }

  const fontClasses = {
    sm: 'text-sm sm:text-base leading-snug',
    md: 'text-base sm:text-xl md:text-2xl leading-relaxed',
    lg: 'text-lg sm:text-2xl md:text-3xl leading-relaxed'
  }[fontSize];

  return (
    <div
      className="absolute bottom-12 sm:bottom-16 inset-x-4 sm:inset-x-12 z-30 pointer-events-none flex justify-center items-end select-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="max-w-3xl text-center px-4 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-100 ease-out">
        <p
          className={`${fontClasses} font-semibold text-white tracking-wide whitespace-pre-line drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}
        >
          {activeCue.text}
        </p>
      </div>
    </div>
  );
};
