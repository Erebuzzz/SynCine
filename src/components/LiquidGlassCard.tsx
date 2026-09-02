import React from 'react';

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'surface' | 'interactive' | 'dock' | 'modal';
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className = '',
  variant = 'surface',
  ...props
}) => {
  const variantStyles = {
    surface:
      'bg-[rgba(10,16,34,0.68)] backdrop-blur-2xl border border-white/[0.12] shadow-[0_24px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.2)]',
    interactive:
      'bg-[rgba(12,20,40,0.6)] hover:bg-[rgba(18,28,56,0.75)] backdrop-blur-xl border border-white/[0.1] hover:border-indigo-500/50 shadow-[0_12px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200',
    dock:
      'bg-[rgba(8,12,26,0.85)] backdrop-blur-3xl border border-white/[0.14] shadow-[0_20px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.22)]',
    modal:
      'bg-[rgba(7,11,24,0.92)] backdrop-blur-3xl border border-white/[0.16] shadow-[0_32px_64px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.25)]'
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {/* Specular Edge Bevel Glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
