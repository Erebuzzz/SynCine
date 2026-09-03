import React from 'react';

export interface EmojiIconProps {
  size?: number;
  className?: string;
}

export type SynEmojiId =
  | 'heart'
  | 'laugh'
  | 'clap'
  | 'fire'
  | 'party'
  | 'popcorn'
  | 'wow'
  | 'tear'
  | 'rocket'
  | 'hundred'
  | 'clapper'
  | 'reel'
  | 'star'
  | 'glasses'
  | 'crown'
  | 'thumbsup'
  | 'sparkles'
  | 'sound'
  | 'ghost'
  | 'gem';

export interface SynEmojiMeta {
  id: SynEmojiId;
  name: string;
  category: 'primary' | 'extended';
  component: React.FC<EmojiIconProps>;
}

/**
 * Cinema Heart - Warm amber-gold heart with radiant inner glow
 */
export const CinemaHeart: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="synHeartGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF4B6E" />
        <stop offset="100%" stopColor="#C8A97E" />
      </linearGradient>
      <filter id="synHeartGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#FF4B6E" floodOpacity="0.3" />
      </filter>
    </defs>
    <path
      d="M16 27.5S4 19.5 4 11A7 7 0 0 1 16 7a7 7 0 0 1 12 4c0 8.5-12 16.5-12 16.5Z"
      fill="url(#synHeartGrad)"
      filter="url(#synHeartGlow)"
    />
    <path
      d="M9 10a4 4 0 0 1 5-2"
      stroke="#FFF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeOpacity="0.6"
    />
  </svg>
);

/**
 * Cinema Laugh - Gleeful cinema face with gold accents
 */
export const CinemaLaugh: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="synLaughGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFD060" />
        <stop offset="100%" stopColor="#C8A97E" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="13" fill="url(#synLaughGrad)" />
    {/* Squinting laughing eyes */}
    <path d="M9 12.5l3.5 2.5L9 17.5" stroke="#4A3B18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 12.5l-3.5 2.5 3.5 2.5" stroke="#4A3B18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Big smile */}
    <path d="M10 18c1.5 5 10.5 5 12 0" fill="#4A3B18" />
    <path d="M12 18.5c1.2 2 6.8 2 8 0" fill="#FFF" />
  </svg>
);

/**
 * Cinema Clap - Audience applause hands
 */
export const CinemaClap: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="synClapGrad" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE08A" />
        <stop offset="100%" stopColor="#C8A97E" />
      </linearGradient>
    </defs>
    {/* Left hand */}
    <path
      d="M13 18l-5 5a3.5 3.5 0 0 0 5 5l6-6-3.5-3.5L13 18Z"
      fill="url(#synClapGrad)"
      stroke="#A88B58"
      strokeWidth="1.2"
    />
    {/* Right hand */}
    <path
      d="M19 14l5-5a3.5 3.5 0 0 0-5-5l-6 6 3.5 3.5L19 14Z"
      fill="url(#synClapGrad)"
      stroke="#A88B58"
      strokeWidth="1.2"
    />
    {/* Motion claps */}
    <path d="M11 7l-2-2M16 4v3M21 7l2-2" stroke="#C8A97E" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * Cinema Fire - Golden flame
 */
export const CinemaFire: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="synFireGrad" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF5722" />
        <stop offset="60%" stopColor="#FF9800" />
        <stop offset="100%" stopColor="#C8A97E" />
      </linearGradient>
      <linearGradient id="synFireCore" x1="16" y1="14" x2="16" y2="27" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF7C2" />
        <stop offset="100%" stopColor="#FFD54F" />
      </linearGradient>
    </defs>
    <path
      d="M16 4C13 9 9 13.5 9 19a8 8 0 0 0 16 0c0-3.5-2-7-4.5-9.5-1 3.5-3.5 5.5-4.5 5.5 0-3 1-8 0-11Z"
      fill="url(#synFireGrad)"
    />
    <path
      d="M16 16c-1.8 2.5-3 4.5-3 7a4 4 0 0 0 8 0c0-2-1-3.5-2-4.5-.5 1-1.5 1.5-2 1.5 0-1.5.5-3 0-4Z"
      fill="url(#synFireCore)"
    />
  </svg>
);

/**
 * Cinema Party - Premiere celebration popper
 */
export const CinemaParty: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="synConeGrad" x1="6" y1="26" x2="18" y2="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E91E63" />
        <stop offset="100%" stopColor="#C8A97E" />
      </linearGradient>
    </defs>
    {/* Popper Cone */}
    <path d="M5 27l4-15 14 14L5 27Z" fill="url(#synConeGrad)" stroke="#C8A97E" strokeWidth="1.2" />
    <path d="M9 12l2 4 4-2" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
    {/* Streamers & Confetti */}
    <circle cx="25" cy="8" r="2" fill="#FFD700" />
    <circle cx="21" cy="5" r="1.5" fill="#4CAF50" />
    <circle cx="28" cy="15" r="1.5" fill="#00BCD4" />
    <path d="M19 11c2-3 4-1 6-4" stroke="#FF5722" strokeWidth="1.75" strokeLinecap="round" fill="none" />
    <path d="M23 18c3-1 3-4 6-3" stroke="#9C27B0" strokeWidth="1.75" strokeLinecap="round" fill="none" />
  </svg>
);

/**
 * Cinema Popcorn - Classic cinema striped bucket with golden popped corn
 */
export const CinemaPopcorn: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    {/* Popcorn fluffy top */}
    <circle cx="12" cy="9" r="4.5" fill="#FFE082" stroke="#C8A97E" strokeWidth="1" />
    <circle cx="20" cy="9" r="4.5" fill="#FFECB3" stroke="#C8A97E" strokeWidth="1" />
    <circle cx="16" cy="6.5" r="4" fill="#FFF59D" stroke="#C8A97E" strokeWidth="1" />
    <circle cx="8.5" cy="11.5" r="3.5" fill="#FFD54F" />
    <circle cx="23.5" cy="11.5" r="3.5" fill="#FFE082" />
    {/* Bucket body */}
    <path d="M8 13l2.5 15h11L24 13H8Z" fill="#F44336" stroke="#C8A97E" strokeWidth="1.2" />
    {/* Classic stripes */}
    <path d="M11 13l1 15h2.5l-1-15h-2.5Z" fill="#FFF" />
    <path d="M17.5 13l.5 15h2.5l-.5-15h-2.5Z" fill="#FFF" />
  </svg>
);

/**
 * Cinema Wow - Cinematic awe / starstruck expression
 */
export const CinemaWow: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="synWowGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="100%" stopColor="#C8A97E" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="13" fill="url(#synWowGrad)" />
    {/* Star Eyes */}
    <polygon points="11,10 12,13 15,13.5 12.5,15.5 13.5,18 11,16.5 8.5,18 9.5,15.5 7,13.5 10,13" fill="#D84315" />
    <polygon points="21,10 22,13 25,13.5 22.5,15.5 23.5,18 21,16.5 18.5,18 19.5,15.5 17,13.5 20,13" fill="#D84315" />
    {/* Open mouth in awe */}
    <ellipse cx="16" cy="22" rx="4" ry="5" fill="#4A3B18" />
  </svg>
);

/**
 * Cinema Tear - Drama / emotional cinematic scene
 */
export const CinemaTear: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="synTearGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE57F" />
        <stop offset="100%" stopColor="#C8A97E" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="13" fill="url(#synTearGrad)" />
    {/* Eyebrows */}
    <path d="M8 10c2-2 4-1 5 0M24 10c-2-2-4-1-5 0" stroke="#4A3B18" strokeWidth="1.5" strokeLinecap="round" />
    {/* Closed emotional eyes */}
    <path d="M9 14c1.5-2 3.5-2 5 0M18 14c1.5-2 3.5-2 5 0" stroke="#4A3B18" strokeWidth="2" strokeLinecap="round" />
    {/* Quivering mouth */}
    <path d="M12 23c2-2 6-2 8 0" stroke="#4A3B18" strokeWidth="2" strokeLinecap="round" />
    {/* Blue tear stream */}
    <path d="M23 15c0 2.5-2 4.5-2 4.5s-2-2-2-4.5a2 2 0 1 1 4 0Z" fill="#29B6F6" />
  </svg>
);

/**
 * Cinema Rocket - Sci-fi launch rocket
 */
export const CinemaRocket: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="synRocketGrad" x1="26" y1="6" x2="10" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#B0BEC5" />
      </linearGradient>
    </defs>
    {/* Exhaust flame */}
    <path d="M11 21l-4 4 1-3-2-2 3 1 2-4" fill="#FF9800" />
    {/* Rocket body */}
    <path
      d="M26 6c-5 1-11 5-13 11l4 4c6-2 10-8 11-13l-2-2Z"
      fill="url(#synRocketGrad)"
      stroke="#C8A97E"
      strokeWidth="1.2"
    />
    {/* Red nosecone */}
    <path d="M26 6c-2 0-4 1-5 2l5 5c1-1 2-3 2-5l-2-2Z" fill="#E53935" />
    {/* Porthole window */}
    <circle cx="18.5" cy="13.5" r="2" fill="#00BCD4" stroke="#FFF" strokeWidth="0.8" />
    {/* Fins */}
    <path d="M13 17l-4 1 2 4 4-2" fill="#E53935" />
  </svg>
);

/**
 * Cinema 100 - Golden rating badge
 */
export const Cinema100: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="syn100Grad" x1="3" y1="8" x2="29" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF3D00" />
        <stop offset="100%" stopColor="#C8A97E" />
      </linearGradient>
    </defs>
    <text
      x="16"
      y="18"
      textAnchor="middle"
      fontSize="12"
      fontWeight="900"
      fontFamily="system-ui, sans-serif"
      fill="url(#syn100Grad)"
      letterSpacing="-0.5"
    >
      100
    </text>
    {/* Double underline */}
    <line x1="6" y1="22" x2="26" y2="22" stroke="url(#syn100Grad)" strokeWidth="2" strokeLinecap="round" />
    <line x1="6" y1="25.5" x2="26" y2="25.5" stroke="url(#syn100Grad)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * Additional Customization SVG Emojis
 */

export const CinemaClapper: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect x="5" y="11" width="22" height="15" rx="2" fill="#212121" stroke="#C8A97E" strokeWidth="1.2" />
    <path d="M5 8h22v4H5z" fill="#37474F" />
    <path d="M9 8l3 4M15 8l3 4M21 8l3 4" stroke="#FFF" strokeWidth="1.5" />
    <polygon points="13,16 19,19 13,22" fill="#C8A97E" />
  </svg>
);

export const CinemaReel: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="12" fill="#263238" stroke="#C8A97E" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="4" fill="#C8A97E" />
    <circle cx="16" cy="7.5" r="2" fill="#C8A97E" />
    <circle cx="24.5" cy="16" r="2" fill="#C8A97E" />
    <circle cx="16" cy="24.5" r="2" fill="#C8A97E" />
    <circle cx="7.5" cy="16" r="2" fill="#C8A97E" />
  </svg>
);

export const CinemaStar: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <polygon
      points="16,4 19.5,12 28,13 21.5,19 23.5,27.5 16,23 8.5,27.5 10.5,19 4,13 12.5,12"
      fill="#FFD54F"
      stroke="#C8A97E"
      strokeWidth="1.2"
    />
  </svg>
);

export const Cinema3DGlasses: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect x="5" y="11" width="9" height="10" rx="1.5" fill="#E53935" stroke="#C8A97E" strokeWidth="1.2" />
    <rect x="18" y="11" width="9" height="10" rx="1.5" fill="#00BCD4" stroke="#C8A97E" strokeWidth="1.2" />
    <path d="M14 15h4" stroke="#C8A97E" strokeWidth="2" />
    <path d="M5 13L2 11M27 13l3-2" stroke="#C8A97E" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const CinemaCrown: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M6 24h20l2-14-6 5-6-9-6 9-6-5 2 14Z" fill="#FFC107" stroke="#C8A97E" strokeWidth="1.2" />
    <circle cx="16" cy="6" r="1.5" fill="#E91E63" />
    <circle cx="6" cy="10" r="1.5" fill="#00BCD4" />
    <circle cx="26" cy="10" r="1.5" fill="#00BCD4" />
  </svg>
);

export const CinemaThumbsUp: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M7 14h4v12H7zM11 26h10a3 3 0 0 0 3-2.5l1.5-7A3 3 0 0 0 22.5 13H17l1-5.5a2 2 0 0 0-2-2.5l-5 9v12Z"
      fill="#FFD54F"
      stroke="#C8A97E"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const CinemaSparkles: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M16 4c0 6.5 5.5 12 12 12-6.5 0-12 5.5-12 12 0-6.5-5.5-12-12-12 6.5 0 12-5.5 12-12Z" fill="#FFE082" />
    <circle cx="8" cy="8" r="2" fill="#FFF" />
    <circle cx="24" cy="24" r="2.5" fill="#FFF" />
  </svg>
);

export const CinemaSound: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M6 12h4l6-5v18l-6-5H6v-8Z" fill="#C8A97E" />
    <path d="M20 10a8 8 0 0 1 0 12M23 7a12 12 0 0 1 0 18" stroke="#C8A97E" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CinemaGhost: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M8 26c1-2 2-2 3 0 1-2 2-2 3 0 1-2 2-2 3 0 1-2 2-2 3 0 1-2 2-2 3 0V14a8 8 0 0 0-16 0v12Z"
      fill="#ECEFF1"
      stroke="#B0BEC5"
      strokeWidth="1.2"
    />
    <circle cx="12.5" cy="14" r="2" fill="#263238" />
    <circle cx="19.5" cy="14" r="2" fill="#263238" />
    <ellipse cx="16" cy="19" rx="2" ry="3" fill="#263238" />
  </svg>
);

export const CinemaGem: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <polygon points="10,6 22,6 28,14 16,27 4,14" fill="#80DEEA" stroke="#00ACC1" strokeWidth="1.2" />
    <polygon points="10,6 16,14 22,6" fill="#B2EBF2" />
    <polygon points="4,14 16,14 16,27" fill="#4DD0E1" />
    <polygon points="28,14 16,14 16,27" fill="#26C6DA" />
  </svg>
);

export const SYN_ALL_EMOJIS: SynEmojiMeta[] = [
  // 10 Default Presets
  { id: 'heart', name: 'Cinema Heart', category: 'primary', component: CinemaHeart },
  { id: 'laugh', name: 'Cinema Laugh', category: 'primary', component: CinemaLaugh },
  { id: 'clap', name: 'Applause', category: 'primary', component: CinemaClap },
  { id: 'fire', name: 'Pure Cinema', category: 'primary', component: CinemaFire },
  { id: 'party', name: 'Premiere', category: 'primary', component: CinemaParty },
  { id: 'popcorn', name: 'Popcorn', category: 'primary', component: CinemaPopcorn },
  { id: 'wow', name: 'Starstruck', category: 'primary', component: CinemaWow },
  { id: 'tear', name: 'Masterpiece', category: 'primary', component: CinemaTear },
  { id: 'rocket', name: 'Blockbuster', category: 'primary', component: CinemaRocket },
  { id: 'hundred', name: '100% Score', category: 'primary', component: Cinema100 },

  // 10 Extended Customization Options
  { id: 'clapper', name: 'Clapperboard', category: 'extended', component: CinemaClapper },
  { id: 'reel', name: 'Film Reel', category: 'extended', component: CinemaReel },
  { id: 'star', name: 'Premiere Star', category: 'extended', component: CinemaStar },
  { id: 'glasses', name: '3D Glasses', category: 'extended', component: Cinema3DGlasses },
  { id: 'crown', name: 'Auteur Crown', category: 'extended', component: CinemaCrown },
  { id: 'thumbsup', name: 'Thumbs Up', category: 'extended', component: CinemaThumbsUp },
  { id: 'sparkles', name: 'Silver Screen', category: 'extended', component: CinemaSparkles },
  { id: 'sound', name: 'Dolby Sound', category: 'extended', component: CinemaSound },
  { id: 'ghost', name: 'Thriller Ghost', category: 'extended', component: CinemaGhost },
  { id: 'gem', name: 'Cinema Gem', category: 'extended', component: CinemaGem },
];

export const SYN_DEFAULT_PRESET_IDS: SynEmojiId[] = [
  'heart',
  'laugh',
  'clap',
  'fire',
  'party',
  'popcorn',
  'wow',
  'tear',
  'rocket',
  'hundred',
];
