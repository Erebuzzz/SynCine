import React, { useEffect, useState, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Positions for smooth interpolation (lerp)
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Check if device supports fine pointer (mouse/trackpad) and not reduced motion
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || prefersReducedMotion) return;

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      // Check if target or parent is interactive
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = Boolean(
          target.closest('button, a, input, textarea, select, [role="button"], .cursor-pointer')
        );
        setIsHovering(interactive);
      }
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth lerp loop for the trailing outer ring
    const loop = () => {
      // 0.18 lerp factor provides a responsive, buttery trailing ring
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.18;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.18;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none">
      {/* Trailing Outer Ring (Semi-transparent with website accent color) */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 rounded-full border border-[var(--accent)] transition-[width,height,background-color,border-color] duration-200 ease-out will-change-transform ${
          isHovering
            ? 'w-12 h-12 bg-[var(--accent)]/15 border-[var(--accent)]/80 scale-110'
            : isClicking
            ? 'w-7 h-7 bg-[var(--accent)]/30 border-[var(--accent)] scale-90'
            : 'w-8 h-8 bg-[var(--accent)]/10 border-[var(--accent)]/50'
        }`}
        style={{
          boxShadow: isHovering
            ? '0 0 15px rgba(200, 169, 126, 0.2)'
            : 'none',
        }}
      />

      {/* Center Precision Accent Dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 rounded-full bg-[var(--accent)] transition-opacity duration-150 will-change-transform ${
          isHovering ? 'w-1 h-1 opacity-40' : 'w-1.5 h-1.5 opacity-90'
        }`}
      />
    </div>
  );
};
