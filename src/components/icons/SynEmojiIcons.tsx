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
 * 1. Cinema Heart - Volumetric 3D Ruby Heart with specular gloss and gold rim
 * Inspired by Noto 3D and Apple Heart emoji
 */
export const CinemaHeart: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <radialGradient id="syn3d_heart_main" cx="30%" cy="25%" r="75%">
        <stop offset="0%" stopColor="#FF5370" />
        <stop offset="35%" stopColor="#E50914" />
        <stop offset="70%" stopColor="#B00020" />
        <stop offset="100%" stopColor="#5E0010" />
      </radialGradient>
      <linearGradient id="syn3d_heart_rim" x1="0" y1="36" x2="36" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#C8A97E" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#FFF" stopOpacity="0.2" />
      </linearGradient>
      <filter id="syn3d_heart_shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#900015" floodOpacity="0.45" />
      </filter>
    </defs>
    {/* Heart Body */}
    <path
      d="M18 32S4 23 4 13a7.5 7.5 0 0 1 14-3.5A7.5 7.5 0 0 1 32 13c0 10-14 19-14 19Z"
      fill="url(#syn3d_heart_main)"
      filter="url(#syn3d_heart_shadow)"
    />
    {/* Bottom/Right Ambient Rim Glow */}
    <path
      d="M18 32S4 23 4 13a7.5 7.5 0 0 1 14-3.5A7.5 7.5 0 0 1 32 13c0 10-14 19-14 19Z"
      stroke="url(#syn3d_heart_rim)"
      strokeWidth="0.75"
    />
    {/* Left Specular Glass Highlight */}
    <path
      d="M10 9a4.5 4.5 0 0 1 6 0c.5.5.5 1.5 0 2-.5.5-1.5.5-2 0A2.5 2.5 0 0 0 10 9Z"
      fill="#FFF"
      opacity="0.85"
    />
    <ellipse cx="9" cy="14" rx="2" ry="3.5" transform="rotate(-20 9 14)" fill="#FFF" opacity="0.45" />
  </svg>
);

/**
 * 2. Cinema Laugh - Noto 3D Style Laughing with Tears of Joy
 */
export const CinemaLaugh: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <radialGradient id="syn3d_laugh_sphere" cx="35%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#FFF275" />
        <stop offset="45%" stopColor="#FFCA28" />
        <stop offset="85%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <linearGradient id="syn3d_laugh_tear" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#40C4FF" />
        <stop offset="100%" stopColor="#0091EA" />
      </linearGradient>
      <radialGradient id="syn3d_laugh_tongue" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#FF80AB" />
        <stop offset="100%" stopColor="#E91E63" />
      </radialGradient>
      <filter id="syn3d_laugh_shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#B26A00" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* 3D Sphere Head */}
    <circle cx="18" cy="18" r="15" fill="url(#syn3d_laugh_sphere)" filter="url(#syn3d_laugh_shadow)" />
    {/* Top Gloss Highlight */}
    <ellipse cx="18" cy="6" rx="9" ry="2.5" fill="#FFF" opacity="0.35" />

    {/* Squinting Laughing Eyes */}
    <path
      d="M8.5 14.5c1.8 2.5 5 2.5 6.8 0"
      stroke="#3E2723"
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M20.7 14.5c1.8 2.5 5 2.5 6.8 0"
      stroke="#3E2723"
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
    />

    {/* Eyebrows */}
    <path d="M8 11.5c2-1 4.5-.5 5.5.5M28 11.5c-2-1-4.5-.5-5.5.5" stroke="#4E342E" strokeWidth="1.6" strokeLinecap="round" />

    {/* Wide Open Smile with Depth */}
    <path
      d="M10 18.5c1.2 8.5 14.8 8.5 16 0H10Z"
      fill="#27130E"
    />
    {/* Tongue */}
    <path
      d="M13 22.5c1.5 4 8.5 4 10 0-1.5-1.5-8.5-1.5-10 0Z"
      fill="url(#syn3d_laugh_tongue)"
    />
    {/* Upper White Teeth */}
    <path
      d="M10.8 18.5c2.5 1.8 11.9 1.8 14.4 0H10.8Z"
      fill="#FFF"
    />

    {/* Left Tear */}
    <path
      d="M6.5 16c0 2 1.8 3.8 3.5 3.8 1.5 0 2.2-1.2 2-2.5C11 15 8 13.5 6.5 16Z"
      fill="url(#syn3d_laugh_tear)"
    />
    <circle cx="8" cy="16.5" r="0.8" fill="#FFF" opacity="0.8" />

    {/* Right Tear */}
    <path
      d="M29.5 16c0 2-1.8 3.8-3.5 3.8-1.5 0-2.2-1.2-2-2.5 1-2.3 4-3.8 5.5-1.3Z"
      fill="url(#syn3d_laugh_tear)"
    />
    <circle cx="28" cy="16.5" r="0.8" fill="#FFF" opacity="0.8" />
  </svg>
);

/**
 * 3. Cinema Clap - 3D Clapping Applause Hands with Golden Impact Sparks
 */
export const CinemaClap: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_clap_skin1" x1="5" y1="5" x2="25" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="50%" stopColor="#FFB74D" />
        <stop offset="100%" stopColor="#E65100" />
      </linearGradient>
      <linearGradient id="syn3d_clap_skin2" x1="15" y1="2" x2="33" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF8E1" />
        <stop offset="60%" stopColor="#FFB74D" />
        <stop offset="100%" stopColor="#BF360C" />
      </linearGradient>
      <filter id="syn3d_clap_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#8D6E63" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Left Hand Base */}
    <path
      d="M13 18l-7 7a4 4 0 0 0 5.6 5.6l8-8-4-4L13 18Z"
      fill="url(#syn3d_clap_skin1)"
      filter="url(#syn3d_clap_shadow)"
    />
    {/* Left Hand Fingers */}
    <path
      d="M9.5 21.5l5.5-5.5a2 2 0 0 1 2.8 2.8L12.3 24.3"
      stroke="#D84315"
      strokeWidth="0.8"
    />
    {/* Right Hand (Front) */}
    <path
      d="M22 15l6-6a4 4 0 0 0-5.6-5.6l-8 8 4 4 3.6-.4Z"
      fill="url(#syn3d_clap_skin2)"
      filter="url(#syn3d_clap_shadow)"
    />
    {/* Right Hand Fingers Highlights */}
    <path
      d="M24.5 12.5l-5.5 5.5a2 2 0 0 1-2.8-2.8l5.5-5.5"
      stroke="#FFF"
      strokeWidth="0.8"
      opacity="0.6"
    />

    {/* Golden Kinetic Impact Sparks */}
    <path d="M12 6l-2-3M18 3v3M24 6l2-3M7 11l-3-1M29 11l3-1" stroke="#FFD54F" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="18" cy="8" r="1.5" fill="#FFC107" />
  </svg>
);

/**
 * 4. Cinema Fire - Multi-layered 3D Volumetric Flame
 */
export const CinemaFire: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_fire_outer" x1="18" y1="2" x2="18" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF1744" />
        <stop offset="35%" stopColor="#FF5722" />
        <stop offset="85%" stopColor="#E65100" />
        <stop offset="100%" stopColor="#BF360C" />
      </linearGradient>
      <linearGradient id="syn3d_fire_mid" x1="18" y1="10" x2="18" y2="33" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFEA00" />
        <stop offset="50%" stopColor="#FF9100" />
        <stop offset="100%" stopColor="#FF3D00" />
      </linearGradient>
      <linearGradient id="syn3d_fire_core" x1="18" y1="18" x2="18" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFDE7" />
        <stop offset="70%" stopColor="#FFF176" />
        <stop offset="100%" stopColor="#FFB300" />
      </linearGradient>
      <filter id="syn3d_fire_glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FF5722" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Outer 3D Flame Body */}
    <path
      d="M18 3C14 9 8 15 8 22a10 10 0 0 0 20 0c0-5-3-9-6-12-1 4.5-4 6.5-5.5 6.5 0-4 1.5-10.5 1.5-13.5Z"
      fill="url(#syn3d_fire_outer)"
      filter="url(#syn3d_fire_glow)"
    />
    {/* Middle Golden Flame */}
    <path
      d="M18 12c-2.5 3.5-5 7.5-5 12a7 7 0 0 0 14 0c0-3.5-2-6-3.5-7.5-.5 2.5-2 3.5-3 3.5 0-2.5.5-6.5-2.5-8Z"
      fill="url(#syn3d_fire_mid)"
    />
    {/* Inner White-Hot Core */}
    <path
      d="M18 20c-1.5 2-2.8 4-2.8 6.5a4.5 4.5 0 0 0 9 0c0-1.8-1-3-1.8-4-.3 1.2-1 1.8-1.7 1.8 0-1.5.3-3.3-2.7-4.3Z"
      fill="url(#syn3d_fire_core)"
    />
  </svg>
);

/**
 * 5. Cinema Party - 3D Premiere Celebration Popper & Confetti
 */
export const CinemaParty: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_cone_grad" x1="4" y1="32" x2="20" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#C2185B" />
        <stop offset="50%" stopColor="#E91E63" />
        <stop offset="100%" stopColor="#FF80AB" />
      </linearGradient>
      <linearGradient id="syn3d_cone_stripe" x1="6" y1="28" x2="16" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#FFA000" />
      </linearGradient>
      <filter id="syn3d_party_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#880E4F" floodOpacity="0.35" />
      </filter>
    </defs>
    {/* 3D Popper Cone */}
    <path d="M4 32l5-18 17 17L4 32Z" fill="url(#syn3d_cone_grad)" filter="url(#syn3d_party_shadow)" />
    {/* Diagonal Gold Stripes */}
    <path d="M8 24l4-4 3 3-4 4-3-3Z" fill="url(#syn3d_cone_stripe)" />
    <path d="M14 18l3-3 3 3-3 3-3-3Z" fill="url(#syn3d_cone_stripe)" />
    {/* Cone Rim Highlight */}
    <path d="M9 14l17 17" stroke="#FFF" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />

    {/* Explosive Confetti Discs with 3D Depth */}
    <circle cx="28" cy="8" r="2.5" fill="#FFD700" />
    <circle cx="28" cy="8" r="1.2" fill="#FFF" opacity="0.6" />
    <circle cx="22" cy="5" r="2" fill="#00E676" />
    <circle cx="32" cy="16" r="2" fill="#00E5FF" />
    <circle cx="16" cy="6" r="1.8" fill="#FF4081" />
    <circle cx="31" cy="24" r="1.5" fill="#7C4DFF" />

    {/* 3D Streamer Ribbons */}
    <path d="M20 13c2-4 6-2 8-6" stroke="#FF5722" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <path d="M25 21c4-2 4-6 7-5" stroke="#E040FB" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <path d="M15 9c2-3 5-1 6-4" stroke="#FFEA00" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

/**
 * 6. Cinema Popcorn - Classic Striped Tub with Fluffy 3D Butter Popcorn
 */
export const CinemaPopcorn: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_tub_red" x1="0" y1="14" x2="0" y2="34">
        <stop offset="0%" stopColor="#FF1744" />
        <stop offset="100%" stopColor="#B71C1C" />
      </linearGradient>
      <linearGradient id="syn3d_tub_white" x1="0" y1="14" x2="0" y2="34">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#CFD8DC" />
      </linearGradient>
      <radialGradient id="syn3d_pop_gold" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#FFFDE7" />
        <stop offset="40%" stopColor="#FFF176" />
        <stop offset="85%" stopColor="#FFCA28" />
        <stop offset="100%" stopColor="#FF8F00" />
      </radialGradient>
      <filter id="syn3d_pop_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="1.8" floodColor="#3E2723" floodOpacity="0.4" />
      </filter>
    </defs>

    {/* Popcorn Fluffy Kernels with 3D Spheres */}
    <circle cx="12" cy="10" r="5" fill="url(#syn3d_pop_gold)" />
    <circle cx="24" cy="10" r="5" fill="url(#syn3d_pop_gold)" />
    <circle cx="18" cy="7" r="5.5" fill="url(#syn3d_pop_gold)" />
    <circle cx="7.5" cy="13" r="4" fill="url(#syn3d_pop_gold)" />
    <circle cx="28.5" cy="13" r="4" fill="url(#syn3d_pop_gold)" />
    <circle cx="14" cy="13" r="4.5" fill="url(#syn3d_pop_gold)" />
    <circle cx="22" cy="13" r="4.5" fill="url(#syn3d_pop_gold)" />

    {/* Popcorn Specular Highlights */}
    <circle cx="17" cy="5.5" r="1.5" fill="#FFF" opacity="0.6" />
    <circle cx="11" cy="8.5" r="1.2" fill="#FFF" opacity="0.6" />
    <circle cx="23" cy="8.5" r="1.2" fill="#FFF" opacity="0.6" />

    {/* Striped Tub Body */}
    <g filter="url(#syn3d_pop_shadow)">
      {/* Base Red Tub */}
      <path d="M8 15l3 18h14l3-18H8Z" fill="url(#syn3d_tub_red)" />
      {/* White Stripes */}
      <path d="M11.5 15l1.2 18h3.2l-1.2-18h-3.2Z" fill="url(#syn3d_tub_white)" />
      <path d="M19.5 15l.8 18h3.2l-.8-18h-3.2Z" fill="url(#syn3d_tub_white)" />
      {/* Gold Top Rim */}
      <ellipse cx="18" cy="15" rx="10" ry="1.5" fill="#FFE082" stroke="#FFB300" strokeWidth="0.8" />
    </g>
  </svg>
);

/**
 * 7. Cinema Wow - Starstruck 3D Face with Faceted Golden Stars
 */
export const CinemaWow: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <radialGradient id="syn3d_wow_sphere" cx="35%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#FFF176" />
        <stop offset="45%" stopColor="#FFCA28" />
        <stop offset="85%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <linearGradient id="syn3d_star_l" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="50%" stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#FF6F00" />
      </linearGradient>
      <filter id="syn3d_wow_shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#B26A00" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* 3D Sphere Head */}
    <circle cx="18" cy="18" r="15" fill="url(#syn3d_wow_sphere)" filter="url(#syn3d_wow_shadow)" />
    <ellipse cx="18" cy="6" rx="9" ry="2.5" fill="#FFF" opacity="0.35" />

    {/* Rosy Cheeks */}
    <circle cx="8" cy="21" r="3" fill="#FF5722" opacity="0.3" />
    <circle cx="28" cy="21" r="3" fill="#FF5722" opacity="0.3" />

    {/* Left 3D Star Eye */}
    <g transform="translate(12 13) scale(0.65)">
      <polygon points="0,-9 2.7,-2.7 9,0 2.7,2.7 0,9 -2.7,2.7 -9,0 -2.7,-2.7" fill="url(#syn3d_star_l)" />
      <polygon points="0,-9 2.7,-2.7 0,0" fill="#FFF" opacity="0.7" />
      <polygon points="9,0 2.7,2.7 0,0" fill="#FF8F00" />
    </g>

    {/* Right 3D Star Eye */}
    <g transform="translate(24 13) scale(0.65)">
      <polygon points="0,-9 2.7,-2.7 9,0 2.7,2.7 0,9 -2.7,2.7 -9,0 -2.7,-2.7" fill="url(#syn3d_star_l)" />
      <polygon points="0,-9 2.7,-2.7 0,0" fill="#FFF" opacity="0.7" />
      <polygon points="9,0 2.7,2.7 0,0" fill="#FF8F00" />
    </g>

    {/* Wide Open Awe Smile */}
    <ellipse cx="18" cy="24" rx="4.5" ry="5.5" fill="#2E1408" />
    <ellipse cx="18" cy="26" rx="3.5" ry="3" fill="#E91E63" />
    <path d="M14.5 20.5c1.8 1.2 5.2 1.2 7 0" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * 8. Cinema Tear - 3D Masterpiece Drama Crying Face
 */
export const CinemaTear: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <radialGradient id="syn3d_tear_sphere" cx="35%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#FFF59D" />
        <stop offset="45%" stopColor="#FFD54F" />
        <stop offset="85%" stopColor="#FFB300" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <linearGradient id="syn3d_tear_drop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#80D8FF" />
        <stop offset="50%" stopColor="#00B0FF" />
        <stop offset="100%" stopColor="#0091EA" />
      </linearGradient>
      <filter id="syn3d_tear_shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#B26A00" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* 3D Sphere Head */}
    <circle cx="18" cy="18" r="15" fill="url(#syn3d_tear_sphere)" filter="url(#syn3d_tear_shadow)" />
    <ellipse cx="18" cy="6" rx="9" ry="2.5" fill="#FFF" opacity="0.35" />

    {/* Expressive Sorrow Eyebrows */}
    <path d="M8 12c2.5-2 5.5-1 6.5 0M28 12c-2.5-2-5.5-1-6.5 0" stroke="#4E342E" strokeWidth="2" strokeLinecap="round" />

    {/* Closed Tearful Eyes */}
    <path d="M10 16.5c1.5-2 4.5-2 6 0M20 16.5c1.5-2 4.5-2 6 0" stroke="#3E2723" strokeWidth="2.2" strokeLinecap="round" />

    {/* Quivering Sad Mouth */}
    <path d="M13 25c2.5-2.5 7.5-2.5 10 0" stroke="#3E2723" strokeWidth="2.2" strokeLinecap="round" />

    {/* Right Luminous Teardrop */}
    <path
      d="M26 18c0 3-2.5 5.5-2.5 5.5s-2.5-2.5-2.5-5.5a2.5 2.5 0 0 1 5 0Z"
      fill="url(#syn3d_tear_drop)"
      filter="drop-shadow(0px 1px 2px rgba(0, 145, 234, 0.5))"
    />
    <circle cx="24.8" cy="18" r="0.8" fill="#FFF" opacity="0.8" />
  </svg>
);

/**
 * 9. Cinema Rocket - 3D Sci-Fi Blockbuster Rocket
 */
export const CinemaRocket: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_rocket_hull" x1="28" y1="6" x2="10" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#90A4AE" />
      </linearGradient>
      <linearGradient id="syn3d_rocket_fin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF1744" />
        <stop offset="100%" stopColor="#B71C1C" />
      </linearGradient>
      <linearGradient id="syn3d_rocket_fire" x1="12" y1="24" x2="2" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFEA00" />
        <stop offset="50%" stopColor="#FF6D00" />
        <stop offset="100%" stopColor="#D50000" />
      </linearGradient>
      <filter id="syn3d_rocket_shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#263238" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Fiery Exhaust Plume */}
    <path d="M13 23l-7 7 2-4-4-2 4-1 5-4" fill="url(#syn3d_rocket_fire)" />

    <g filter="url(#syn3d_rocket_shadow)">
      {/* Side Stabilizer Fins */}
      <path d="M14 20l-5 2 2 5 5-2" fill="url(#syn3d_rocket_fin)" />
      <path d="M20 14l2-5 5 2-2 5" fill="url(#syn3d_rocket_fin)" />

      {/* Main Rocket Fuselage */}
      <path
        d="M29 7c-6 1-13 6-15 13l5 5c7-2 12-9 13-15l-3-3Z"
        fill="url(#syn3d_rocket_hull)"
      />

      {/* Red Nosecone */}
      <path d="M29 7c-3 0-5 1-6 2l7 7c1-1 2-3 2-6l-3-3Z" fill="url(#syn3d_rocket_fin)" />

      {/* Cockpit Porthole Glass with Reflection */}
      <circle cx="21" cy="15" r="3" fill="#00E5FF" stroke="#37474F" strokeWidth="0.8" />
      <ellipse cx="20.2" cy="14.2" rx="1.5" ry="1" fill="#FFF" opacity="0.75" />
    </g>
  </svg>
);

/**
 * 10. Cinema 100 - Bold Glossy 3D 100% Score Rating
 */
export const Cinema100: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_100_grad" x1="4" y1="8" x2="32" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF1744" />
        <stop offset="40%" stopColor="#FF5252" />
        <stop offset="100%" stopColor="#D50000" />
      </linearGradient>
      <filter id="syn3d_100_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#B71C1C" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#syn3d_100_shadow)">
      {/* Bold 100 Digits */}
      <text
        x="18"
        y="21"
        textAnchor="middle"
        fontSize="15"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="url(#syn3d_100_grad)"
        letterSpacing="-0.5"
      >
        100
      </text>

      {/* Double Underline Bars */}
      <line x1="5" y1="25" x2="31" y2="25" stroke="url(#syn3d_100_grad)" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="5" y1="29" x2="31" y2="29" stroke="url(#syn3d_100_grad)" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 11. Cinema Clapper - 3D Director's Clapperboard with Realistic Wood/Metal
 */
export const CinemaClapper: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_clap_board" x1="0" y1="12" x2="0" y2="32">
        <stop offset="0%" stopColor="#263238" />
        <stop offset="100%" stopColor="#101416" />
      </linearGradient>
      <filter id="syn3d_clapper_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#syn3d_clapper_shadow)">
      {/* Slate Body */}
      <rect x="5" y="13" width="26" height="17" rx="3" fill="url(#syn3d_clap_board)" stroke="#C8A97E" strokeWidth="1" />
      {/* Play Arrow Emblem */}
      <polygon points="15,19 23,23 15,27" fill="#C8A97E" />

      {/* Hinged Top Clapper Stick (Angled 20deg) */}
      <g transform="rotate(-15 5 12)">
        <rect x="4" y="8" width="27" height="5" rx="1.5" fill="#212121" stroke="#FFF" strokeWidth="0.5" />
        {/* Zebra Stripes */}
        <polygon points="7,8 10,8 8,13 5,13" fill="#FFF" />
        <polygon points="13,8 16,8 14,13 11,13" fill="#FFF" />
        <polygon points="19,8 22,8 20,13 17,13" fill="#FFF" />
        <polygon points="25,8 28,8 26,13 23,13" fill="#FFF" />
      </g>
      {/* Metallic Hinge Screw */}
      <circle cx="5.5" cy="12.5" r="1.5" fill="#ECEFF1" stroke="#78909C" strokeWidth="0.6" />
    </g>
  </svg>
);

/**
 * 12. Cinema Reel - 3D 35mm Film Spool with Metallic Reflections
 */
export const CinemaReel: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <radialGradient id="syn3d_reel_spool" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#455A64" />
        <stop offset="60%" stopColor="#263238" />
        <stop offset="100%" stopColor="#101416" />
      </radialGradient>
      <linearGradient id="syn3d_reel_gold" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="100%" stopColor="#C8A97E" />
      </linearGradient>
      <filter id="syn3d_reel_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#000" floodOpacity="0.45" />
      </filter>
    </defs>
    <circle cx="18" cy="18" r="14.5" fill="url(#syn3d_reel_spool)" stroke="url(#syn3d_reel_gold)" strokeWidth="1.8" filter="url(#syn3d_reel_shadow)" />
    {/* Center Hub */}
    <circle cx="18" cy="18" r="4.5" fill="url(#syn3d_reel_gold)" />
    <circle cx="18" cy="18" r="2" fill="#101416" />

    {/* 4 Circular Film Core Windows */}
    <circle cx="18" cy="8" r="2.8" fill="#101416" stroke="url(#syn3d_reel_gold)" strokeWidth="1" />
    <circle cx="28" cy="18" r="2.8" fill="#101416" stroke="url(#syn3d_reel_gold)" strokeWidth="1" />
    <circle cx="18" cy="28" r="2.8" fill="#101416" stroke="url(#syn3d_reel_gold)" strokeWidth="1" />
    <circle cx="8" cy="18" r="2.8" fill="#101416" stroke="url(#syn3d_reel_gold)" strokeWidth="1" />
  </svg>
);

/**
 * 13. Cinema Star - Faceted 3D Gold Star
 */
export const CinemaStar: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_star_top" x1="18" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="100%" stopColor="#FFD54F" />
      </linearGradient>
      <linearGradient id="syn3d_star_bottom" x1="18" y1="18" x2="18" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#E65100" />
      </linearGradient>
      <filter id="syn3d_star_shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#B26A00" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#syn3d_star_shadow)">
      {/* 5-Point Star with Low-Poly 3D Facets */}
      <polygon points="18,3 22.5,13.5 34,14.5 25.5,21.5 28,33 18,27 8,33 10.5,21.5 2,14.5 13.5,13.5" fill="url(#syn3d_star_bottom)" />
      {/* Facet Light Highlights */}
      <polygon points="18,3 18,27 22.5,13.5" fill="url(#syn3d_star_top)" />
      <polygon points="18,3 18,27 10.5,21.5" fill="#FFE082" opacity="0.6" />
      <polygon points="18,27 34,14.5 25.5,21.5" fill="#FF8F00" />
      <polygon points="18,27 2,14.5 8,33" fill="#BF360C" opacity="0.5" />
    </g>
  </svg>
);

/**
 * 14. Cinema 3D Glasses - Retro Anaglyph Red & Cyan Spectacles
 */
export const Cinema3DGlasses: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_lens_red" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF1744" />
        <stop offset="100%" stopColor="#B71C1C" />
      </linearGradient>
      <linearGradient id="syn3d_lens_cyan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#00E5FF" />
        <stop offset="100%" stopColor="#00838F" />
      </linearGradient>
      <filter id="syn3d_glasses_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#000" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#syn3d_glasses_shadow)">
      {/* Left Red 3D Lens */}
      <rect x="5" y="13" width="11" height="12" rx="2" fill="url(#syn3d_lens_red)" stroke="#FFF" strokeWidth="1.2" />
      <path d="M7 15l7 8" stroke="#FFF" strokeWidth="1" opacity="0.5" strokeLinecap="round" />

      {/* Right Cyan 3D Lens */}
      <rect x="20" y="13" width="11" height="12" rx="2" fill="url(#syn3d_lens_cyan)" stroke="#FFF" strokeWidth="1.2" />
      <path d="M22 15l7 8" stroke="#FFF" strokeWidth="1" opacity="0.5" strokeLinecap="round" />

      {/* Frame Bridge & Temples */}
      <rect x="15" y="16" width="6" height="3" rx="1" fill="#FFFFFF" />
      <path d="M5 15l-3-3M31 15l3-3" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 15. Cinema Crown - 3D Auteur / Festival Gold Crown
 */
export const CinemaCrown: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_crown_gold" x1="18" y1="4" x2="18" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="40%" stopColor="#FFD54F" />
        <stop offset="80%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#E65100" />
      </linearGradient>
      <filter id="syn3d_crown_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#B26A00" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#syn3d_crown_shadow)">
      {/* 3D Crown Silhouette */}
      <path
        d="M5 26h26l2.5-16-7.5 6L18 6l-8 10-7.5-6L5 26Z"
        fill="url(#syn3d_crown_gold)"
        stroke="#FFE082"
        strokeWidth="1"
      />
      {/* Base Band with Gems */}
      <rect x="5" y="24" width="26" height="5" rx="1.5" fill="#FFA000" stroke="#FFD54F" strokeWidth="0.8" />
      <circle cx="11" cy="26.5" r="1.5" fill="#E91E63" />
      <circle cx="18" cy="26.5" r="1.8" fill="#00E5FF" />
      <circle cx="25" cy="26.5" r="1.5" fill="#00E676" />

      {/* Jewels on Crown Peaks */}
      <circle cx="18" cy="6" r="2" fill="#E91E63" stroke="#FFF" strokeWidth="0.6" />
      <circle cx="5" cy="10" r="1.8" fill="#00E5FF" stroke="#FFF" strokeWidth="0.6" />
      <circle cx="31" cy="10" r="1.8" fill="#00E5FF" stroke="#FFF" strokeWidth="0.6" />
    </g>
  </svg>
);

/**
 * 16. Cinema Thumbs Up - 3D Golden Hand
 */
export const CinemaThumbsUp: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_thumb_grad" x1="6" y1="4" x2="30" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="45%" stopColor="#FFCA28" />
        <stop offset="85%" stopColor="#FF9800" />
        <stop offset="100%" stopColor="#E65100" />
      </linearGradient>
      <filter id="syn3d_thumb_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="1.8" floodColor="#8D6E63" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#syn3d_thumb_shadow)">
      {/* Wrist / Palm base */}
      <rect x="6" y="16" width="5" height="13" rx="2" fill="url(#syn3d_thumb_grad)" />
      {/* Hand Body with Thumb */}
      <path
        d="M11 29h12a4 4 0 0 0 3.8-3.2l1.6-8.5a3.5 3.5 0 0 0-3.4-4.3H19l1.2-6.5a2.5 2.5 0 0 0-2.5-3l-6.7 11v14.5Z"
        fill="url(#syn3d_thumb_grad)"
        stroke="#FFA000"
        strokeWidth="0.8"
      />
      {/* Top Specular Rim */}
      <path d="M18.5 3.8a2.5 2.5 0 0 0-2 2.5l-1 5" stroke="#FFF" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 17. Cinema Sparkles - Luminous 3D Starbursts
 */
export const CinemaSparkles: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <radialGradient id="syn3d_spark_main" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="35%" stopColor="#FFF9C4" />
        <stop offset="70%" stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#FF9800" />
      </radialGradient>
    </defs>
    {/* Large Center Sparkle */}
    <path
      d="M18 4c0 7 7 14 14 14-7 0-14 7-14 14 0-7-7-14-14-14 7 0 14-7 14-14Z"
      fill="url(#syn3d_spark_main)"
      filter="drop-shadow(0px 0px 3px rgba(255, 213, 79, 0.7))"
    />
    <circle cx="18" cy="18" r="2" fill="#FFF" />

    {/* Top-Right Secondary Sparkle */}
    <path
      d="M28 4c0 3.5 3.5 7 7 7-3.5 0-7 3.5-7 7 0-3.5-3.5-7-7-7 3.5 0 7-3.5 7-7Z"
      fill="url(#syn3d_spark_main)"
    />

    {/* Bottom-Left Minor Sparkle */}
    <path
      d="M7 23c0 2.5 2.5 5 5 5-2.5 0-5 2.5-5 5 0-2.5-2.5-5-5-5 2.5 0 5-2.5 5-5Z"
      fill="url(#syn3d_spark_main)"
    />
  </svg>
);

/**
 * 18. Cinema Sound - Dolby Megaphone Speaker with 3D Acoustic Waves
 */
export const CinemaSound: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_sound_horn" x1="4" y1="12" x2="20" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="50%" stopColor="#FFB300" />
        <stop offset="100%" stopColor="#E65100" />
      </linearGradient>
      <filter id="syn3d_sound_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#8D6E63" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#syn3d_sound_shadow)">
      {/* Megaphone Cone */}
      <path d="M5 14h5l8-6v20l-8-6H5v-8Z" fill="url(#syn3d_sound_horn)" stroke="#FFE082" strokeWidth="0.8" />

      {/* Soundwave Arcs */}
      <path d="M22 13a7 7 0 0 1 0 10" stroke="#FFB300" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 9a12 12 0 0 1 0 18" stroke="#FF8F00" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 5a17 17 0 0 1 0 26" stroke="#FF6F00" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 19. Cinema Ghost - Cute 3D Thriller / Horror Ghost
 */
export const CinemaGhost: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_ghost_body" x1="18" y1="4" x2="18" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#ECEFF1" />
        <stop offset="100%" stopColor="#CFD8DC" />
      </linearGradient>
      <filter id="syn3d_ghost_shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#78909C" floodOpacity="0.35" />
      </filter>
    </defs>
    <g filter="url(#syn3d_ghost_shadow)">
      {/* Floating Ghost Body with Wavy Skirt */}
      <path
        d="M7 30c1.5-2 3-2 4.5 0 1.5-2 3-2 4.5 0 1.5-2 3-2 4.5 0 1.5-2 3-2 4.5 0 1.5-2 3-2 4 0V15a11 11 0 0 0-22 0v15Z"
        fill="url(#syn3d_ghost_body)"
      />
      {/* Top Gloss */}
      <ellipse cx="18" cy="7" rx="6" ry="2" fill="#FFF" opacity="0.6" />

      {/* Spooky Cute Eyes */}
      <circle cx="13.5" cy="16" r="2.5" fill="#263238" />
      <circle cx="14.3" cy="15.2" r="0.8" fill="#FFF" />
      <circle cx="22.5" cy="16" r="2.5" fill="#263238" />
      <circle cx="23.3" cy="15.2" r="0.8" fill="#FFF" />

      {/* Surprised Mouth */}
      <ellipse cx="18" cy="22" rx="2.2" ry="3.5" fill="#263238" />
      {/* Little Arms */}
      <path d="M7 20c-2 0-3-1-4-3M29 20c2 0 3-1 4-3" stroke="#CFD8DC" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 20. Cinema Gem - Multi-Faceted Brilliant Cut Diamond
 */
export const CinemaGem: React.FC<EmojiIconProps> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="syn3d_gem_table" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#E0F7FA" />
        <stop offset="100%" stopColor="#80DEEA" />
      </linearGradient>
      <linearGradient id="syn3d_gem_crown" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#B2EBF2" />
        <stop offset="100%" stopColor="#26C6DA" />
      </linearGradient>
      <linearGradient id="syn3d_gem_pavilion" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#00BCD4" />
        <stop offset="100%" stopColor="#00838F" />
      </linearGradient>
      <filter id="syn3d_gem_glow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0097A7" floodOpacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#syn3d_gem_glow)">
      {/* Brilliant Facets */}
      <polygon points="11,7 25,7 32,16 18,31 4,16" fill="url(#syn3d_gem_pavilion)" />
      <polygon points="11,7 25,7 18,16" fill="url(#syn3d_gem_table)" />
      <polygon points="4,16 11,7 18,16" fill="url(#syn3d_gem_crown)" />
      <polygon points="32,16 25,7 18,16" fill="#4DD0E1" />
      <polygon points="4,16 18,16 18,31" fill="#00ACC1" />
      <polygon points="32,16 18,16 18,31" fill="#00838F" />

      {/* Top Glint Sparkle */}
      <polygon points="11,7 13,8 11,9 9,8" fill="#FFF" />
      <circle cx="11" cy="7" r="1.5" fill="#FFF" />
    </g>
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
