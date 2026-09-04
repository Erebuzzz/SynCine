import React, { useRef, useEffect } from 'react';
import { isSoftwareRenderingDetected } from '../lib/performance-detect';

interface ShaderCanvasProps {
  isDark?: boolean;
}

/**
 * Barely perceptible warm atmospheric drift on pure black.
 * Uses 2D canvas with transparent alpha and subtle radial gradients.
 * Leaves the body background (pure OLED black in dark mode) completely unmasked.
 */
export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({ isDark: propIsDark }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const isDarkRef = useRef<boolean | undefined>(propIsDark);
  const renderRef = useRef<() => void>(() => {});

  useEffect(() => {
    isDarkRef.current = propIsDark;
    if (renderRef.current) {
      renderRef.current();
    }
  }, [propIsDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Standard alpha-enabled 2D context allowing transparent background
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      if (renderRef.current) {
        renderRef.current();
      }
    };
    window.addEventListener('resize', handleResize);

    const resolveIsDark = (): boolean => {
      if (typeof isDarkRef.current === 'boolean') {
        return isDarkRef.current;
      }
      return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    };

    let time = 0;

    const render = () => {
      time += 0.003;
      const effectiveDark = resolveIsDark();

      // Clear the canvas to keep native transparency without opaque color fills
      ctx.clearRect(0, 0, width, height);

      if (effectiveDark) {
        // Pure OLED dark drift: two faint amber/warm radial glow spots
        const cx1 = width * 0.3 + Math.sin(time * 0.7) * width * 0.08;
        const cy1 = height * 0.4 + Math.cos(time * 0.5) * height * 0.06;
        const r1 = Math.min(width, height) * 0.5;

        const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, r1);
        g1.addColorStop(0, 'rgba(200, 169, 126, 0.035)');
        g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        const cx2 = width * 0.7 + Math.cos(time * 0.4) * width * 0.06;
        const cy2 = height * 0.6 + Math.sin(time * 0.6) * height * 0.05;
        const r2 = Math.min(width, height) * 0.4;

        const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2);
        g2.addColorStop(0, 'rgba(180, 140, 90, 0.025)');
        g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Light mode: very faint warm radial sunbeam drift
        const cx1 = width * 0.4 + Math.sin(time * 0.5) * width * 0.05;
        const cy1 = height * 0.35 + Math.cos(time * 0.4) * height * 0.04;
        const r1 = Math.min(width, height) * 0.6;

        const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, r1);
        g1.addColorStop(0, 'rgba(200, 169, 126, 0.04)');
        g1.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);
      }
    };

    renderRef.current = render;

    // Respect reduced motion or software-rendering mode to save CPU
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isSoftware = isSoftwareRenderingDetected();
    const shouldThrottle = motionQuery.matches || isSoftware;

    let isRunning = false;
    const loop = () => {
      render();
      if (!shouldThrottle) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    if (shouldThrottle) {
      render();
    } else {
      isRunning = true;
      animFrameRef.current = requestAnimationFrame(loop);
    }

    // Observer for external theme changes when propIsDark is not passed
    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (typeof isDarkRef.current !== 'boolean') {
          render();
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    // Pause when tab is hidden
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrameRef.current);
      } else if (!shouldThrottle) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        render();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (isRunning) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};
