import React from 'react';

type CardVariant = 'surface' | 'interactive' | 'dock' | 'modal';

interface LiquidGlassCardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  surface: 'realistic-glass rounded-2xl overflow-hidden',
  interactive: 'realistic-glass rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-xl cursor-pointer',
  dock: 'realistic-glass rounded-2xl overflow-hidden border-t border-black/[0.06] dark:border-white/[0.08]',
  modal: 'realistic-glass rounded-2xl overflow-hidden shadow-2xl',
};

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  variant = 'surface',
  className = '',
  children,
}) => {
  return (
    <div className={`${variantStyles[variant]} ${className}`}>
      {/* Specular Edge Highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
