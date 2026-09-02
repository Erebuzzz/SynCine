import React from 'react';

type CardVariant = 'surface' | 'interactive' | 'dock' | 'modal';

interface LiquidGlassCardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  surface: [
    'bg-black/[0.03] dark:bg-white/[0.04]',
    'backdrop-blur-xl',
    'border border-black/[0.06] dark:border-white/[0.08]',
    'shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
  ].join(' '),

  interactive: [
    'bg-black/[0.02] dark:bg-white/[0.03]',
    'hover:bg-black/[0.05] dark:hover:bg-white/[0.07]',
    'backdrop-blur-xl',
    'border border-black/[0.06] dark:border-white/[0.06]',
    'hover:border-black/[0.12] dark:hover:border-white/[0.12]',
    'shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
    'transition-all duration-200',
  ].join(' '),

  dock: [
    'bg-white/90 dark:bg-black/90',
    'backdrop-blur-xl',
    'border-t border-black/[0.06] dark:border-white/[0.08]',
    'shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)]',
  ].join(' '),

  modal: [
    'bg-white/95 dark:bg-[rgba(10,10,10,0.95)]',
    'backdrop-blur-lg',
    'border border-black/[0.08] dark:border-white/[0.1]',
    'shadow-2xl',
  ].join(' '),
};

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  variant = 'surface',
  className = '',
  children,
}) => {
  return (
    <div className={`relative rounded-2xl overflow-hidden ${variantStyles[variant]} ${className}`}>
      {/* Subtle top specular edge line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/[0.06] dark:via-white/[0.1] to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
