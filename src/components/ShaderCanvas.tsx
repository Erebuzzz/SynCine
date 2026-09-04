import React, { useRef, useEffect } from 'react';
import { isSoftwareRenderingDetected } from '../lib/performance-detect';

/**
 * Barely perceptible warm atmospheric drift on pure black.
 * Uses 2D canvas with extremely subtle radial gradients that shift slowly.
 * Falls back gracefully when WebGL is unavailable.
 */
export const ShaderCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
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
    };
    window.addEventListener('resize', handleResize);

    // Check if user is in dark mode
    const isDark = () => document.documentElement.classList.contains('dark');

    let time = 0;

    const render = () => {
      time += 0.003;

      if (isDark()) {
        // Pure black base
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Barely perceptible warm drift -- two very faint radial spots that move
        const cx1 = width * 0.3 + Math.sin(time * 0.7) * width * 0.08;
        const cy1 = height * 0.4 + Math.cos(time * 0.5) * height * 0.06;
        const r1 = Math.min(width, height) * 0.5;

        const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, r1);
        g1.addColorStop(0, 'rgba(40, 30, 18, 0.08)');
        g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        const cx2 = width * 0.7 + Math.cos(time * 0.4) * width * 0.06;
        const cy2 = height * 0.6 + Math.sin(time * 0.6) * height * 0.05;
        const r2 = Math.min(width, height) * 0.4;

        const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2);
        g2.addColorStop(0, 'rgba(30, 24, 14, 0.06)');
        g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Light mode: very faint warm radial on white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        const cx1 = width * 0.4 + Math.sin(time * 0.5) * width * 0.05;
        const cy1 = height * 0.35 + Math.cos(time * 0.4) * height * 0.04;
        const r1 = Math.min(width, height) * 0.6;

        const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, r1);
        g1.addColorStop(0, 'rgba(200, 169, 126, 0.04)');
        g1.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    // Respect reduced motion or software-rendering mode to save CPU
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isSoftware = isSoftwareRenderingDetected();
    if (motionQuery.matches || isSoftware) {
      // Render once to establish background, but do not burn CPU in a 60fps loop
      render();
      cancelAnimationFrame(animFrameRef.current);
    } else {
      render();
    }

    // Pause when tab is hidden
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrameRef.current);
      } else {
        render();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);


    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.6 }}
      aria-hidden="true"
    />
  );
};
