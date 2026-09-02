import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * SynCine S+C Interlocking Convergence Logo.
 * Merges the letters 'S' (Syn) and 'C' (Cine) as two interlocking geometric arcs
 * with an integrated central playback triangle.
 */
export const SynLogo: React.FC<IconProps> = ({ size = 36, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="SynCine logo"
  >
    {/* Outer subtle ring */}
    <circle
      cx="24"
      cy="24"
      r="22"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeOpacity="0.2"
    />

    {/* Letter 'S' arc (top loop sweeping to center) */}
    <path
      d="M33 16C33 13 30 11 25 11C18 11 15 15 15 19C15 25 33 23 33 29C33 34 29 37 23 37C17 37 14 34 14 31"
      stroke="var(--accent, #C8A97E)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Letter 'C' arc (interlocking right-side aperture) */}
    <path
      d="M31 17.5C28.5 14.5 24 13.5 20 16C15 19 15 29 20 32C24 34.5 28.5 33.5 31 30.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeOpacity="0.45"
    />

    {/* Center playback triangle */}
    <polygon
      points="22,20 28,24 22,28"
      fill="var(--accent, #C8A97E)"
    />
  </svg>
);

/**
 * Screen cast / broadcast icon
 */
export const ScreenCastIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
    <line x1="2" y1="20" x2="2.01" y2="20" />
  </svg>
);

/**
 * Cinema reel icon
 */
export const CinemaReelIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

/**
 * P2P mesh network icon
 */
export const MeshNetworkIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="18" x2="16" y2="18" />
    <line x1="6" y1="8" x2="6" y2="16" />
    <line x1="18" y1="8" x2="18" y2="16" />
    <line x1="7.8" y1="7.8" x2="16.2" y2="16.2" />
    <line x1="16.2" y1="7.8" x2="7.8" y2="16.2" />
  </svg>
);

/**
 * Latency sync / drift compensation icon
 */
export const LatencySyncIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
    <path d="M4.93 4.93l2.83 2.83" />
    <path d="M16.24 16.24l2.83 2.83" />
  </svg>
);

/**
 * Theater layout icon
 */
export const TheaterLayoutIcon: React.FC<IconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="3" width="13" height="14" rx="2" />
    <rect x="16" y="3" width="3" height="6" rx="1" />
    <rect x="16" y="11" width="3" height="6" rx="1" />
  </svg>
);

/**
 * Grid layout icon
 */
export const GridLayoutIcon: React.FC<IconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="1" width="8" height="8" rx="2" />
    <rect x="11" y="1" width="8" height="8" rx="2" />
    <rect x="1" y="11" width="8" height="8" rx="2" />
    <rect x="11" y="11" width="8" height="8" rx="2" />
  </svg>
);

/**
 * Floating layout icon
 */
export const FloatingLayoutIcon: React.FC<IconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="1" width="18" height="18" rx="2" />
    <rect x="11" y="11" width="7" height="5" rx="1.5" />
  </svg>
);

/**
 * Microphone icon (active state)
 */
export const LiquidMicIcon: React.FC<IconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

/**
 * Microphone muted icon
 */
export const LiquidMicOffIcon: React.FC<IconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
    <path d="M19 10a7 7 0 0 1-.11 1.23" />
  </svg>
);
