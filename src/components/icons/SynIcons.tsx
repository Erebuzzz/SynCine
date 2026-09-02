import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * SynCine Logo: Handcrafted Greek "Σ" (Sigma) and Cinema Infinity Reel.
 * Symbolizes "Syn" (Together in Greek) and synchronized media convergence.
 */
export const SynLogo: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="syn-grad-primary" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#818CF8" />
        <stop offset="50%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
      <linearGradient id="syn-grad-accent" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#818CF8" />
      </linearGradient>
      <filter id="syn-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Outer Cinematic Aperture Ring */}
    <circle
      cx="24"
      cy="24"
      r="21"
      stroke="url(#syn-grad-primary)"
      strokeWidth="2"
      strokeOpacity="0.4"
      strokeDasharray="4 4"
    />

    {/* Dual Converging Fluid Reels (Greek Sigma / Infinity Convergence) */}
    <path
      d="M14 13.5H34L22 24L34 34.5H14"
      stroke="url(#syn-grad-primary)"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#syn-glow)"
    />

    {/* Center Play Convergence Node */}
    <polygon points="21,20 28,24 21,28" fill="url(#syn-grad-accent)" />

    {/* Left Peer Pulse Satellite */}
    <circle cx="12" cy="24" r="2.5" fill="#22D3EE" />
    {/* Right Peer Pulse Satellite */}
    <circle cx="36" cy="24" r="2.5" fill="#EC4899" />
  </svg>
);

export const CinemaReelIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="3" />
    <path d="M7 2v20" />
    <path d="M17 2v20" />
    <path d="M2 12h20" />
    <path d="M2 7h5" />
    <path d="M2 17h5" />
    <path d="M17 17h5" />
    <path d="M17 7h5" />
  </svg>
);

export const ScreenCastIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <path d="M2 8V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    <path d="M2 12a9 9 0 0 1 9 9" />
    <path d="M2 16a5 5 0 0 1 5 5" />
    <line x1="2" y1="20" x2="2.01" y2="20" />
  </svg>
);

export const MeshNetworkIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="5" cy="18" r="2.5" />
    <circle cx="19" cy="18" r="2.5" />
    <line x1="12" y1="7.5" x2="5" y2="15.5" />
    <line x1="12" y1="7.5" x2="19" y2="15.5" />
    <line x1="7.5" y1="18" x2="16.5" y2="18" />
  </svg>
);

export const LatencySyncIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
    <path d="M18 3l3 3-3 3" />
    <path d="M6 21l-3-3 3-3" />
  </svg>
);

export const LiquidMicIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

export const LiquidMicOffIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

export const TheaterLayoutIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <rect x="2" y="3" width="14" height="18" rx="2" />
    <rect x="18" y="3" width="4" height="8" rx="1.5" />
    <rect x="18" y="13" width="4" height="8" rx="1.5" />
  </svg>
);

export const GridLayoutIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
  </svg>
);

export const FloatingLayoutIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
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
    {...props}
  >
    <rect x="2" y="3" width="20" height="18" rx="2.5" />
    <rect x="13" y="12" width="7" height="7" rx="1.5" strokeDasharray="2 2" />
    <circle cx="7" cy="8" r="1.5" fill="currentColor" />
  </svg>
);
