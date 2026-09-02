import React from 'react';

/**
 * Procedural SVG filters for liquid glass refraction and cinematic 35mm film grain.
 * Powered by <feTurbulence> and <feDisplacementMap> with zero external image bandwidth.
 */
export const LiquidGlassFilters: React.FC = () => {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        {/* Liquid Glass Refraction Filter */}
        <filter id="liquid-glass-refraction" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.02"
            numOctaves="3"
            seed="7"
            result="noiseField"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noiseField"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="0.4" result="smoothDisplaced" />
          <feBlend in="SourceGraphic" in2="smoothDisplaced" mode="screen" />
        </filter>

        {/* Cinematic Film Grain Filter */}
        <filter id="film-grain-filter" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 0.045 0"
            result="grainAlpha"
          />
          <feBlend in="SourceGraphic" in2="grainAlpha" mode="overlay" />
        </filter>

        {/* Ambient Wave Distortion Filter */}
        <filter id="ambient-wave" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.008 0.015"
            numOctaves="2"
            seed="3"
            result="waveNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="waveNoise"
            scale="28"
            xChannelSelector="R"
            yChannelSelector="B"
            result="waveDisplaced"
          />
        </filter>
      </defs>
    </svg>
  );
};
