import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SynLogo } from './icons/SynIcons';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Sparkles, Radio, Compass, Sun, Moon } from 'lucide-react';
import { ShaderCanvas } from './ShaderCanvas';
import {
  ThemeMode,
  getSavedThemeMode,
  setSavedThemeMode,
  resolveThemeIsDark,
  getISTCycleState,
  applyISTReflectionCSS
} from '../lib/time-cycle';

interface NotFoundProps {
  onReturnHome: () => void;
  message?: string;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
}

interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  vertices: Array<{ x: number; y: number }>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export const NotFound: React.FC<NotFoundProps> = ({
  onReturnHome,
  message = 'The requested watchroom or page could not be located.'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'drifting' | 'lost' | 'synced'>('drifting');
  const [lossReason, setLossReason] = useState<string>('');
  const [distance, setDistance] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('syncine-space-drift-high');
      return stored ? parseInt(stored, 10) || 0 : 0;
    }
    return 0;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Theme state: dark vs light
  const [, setThemeMode] = useState<ThemeMode>(() => getSavedThemeMode());
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || resolveThemeIsDark(getSavedThemeMode());
    }
    return true;
  });

  const handleToggleTheme = () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
    setSavedThemeMode(nextMode);
    const nextDark = nextMode === 'dark';
    setIsDark(nextDark);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (nextDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
      const state = getISTCycleState();
      applyISTReflectionCSS(state, nextDark);
    }
  };

  // Mutable internal game engine ref
  const gameRef = useRef({
    width: 600,
    height: 360,
    ship: {
      x: 100,
      y: 180,
      vx: 0,
      vy: 0,
      targetX: 130,
      targetY: 180,
      angle: 0
    },
    stars: [] as Star[],
    debris: [] as Debris[],
    particles: [] as Particle[],
    gravityWell: {
      x: 520,
      y: 285,
      radius: 18,
      influenceRadius: 165,
      mass: 1500
    },
    roomPlanet: {
      x: 460,
      y: 80,
      radius: 14,
      code: '/e89-ag8-zm5',
      beaconAngle: 0
    },
    scoreVal: 0,
    timeAlive: 0,
    lastSpawnTime: 0,
    animFrameId: 0,
    audioCtx: null as AudioContext | null,
    hasInteracted: false
  });

  // Synthesizer for cosmic soundscapes (zero external assets)
  const playCosmicSound = useCallback((type: 'thrust' | 'lost' | 'synced') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!gameRef.current.audioCtx) {
        gameRef.current.audioCtx = new AudioContextClass();
      }
      const ctx = gameRef.current.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      if (type === 'lost') {
        // Soft calming low-frequency descent (no jumpscare)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.45);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'synced') {
        // Ascending harmonic celestial chord (C5, E5, G5, C6)
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.65);
        });
      }
    } catch {
      // AudioContext unavailable
    }
  }, [soundEnabled]);

  // Restart / Respawn flight
  const handleRespawn = useCallback(() => {
    const g = gameRef.current;
    g.ship.x = 90;
    g.ship.y = g.height / 2;
    g.ship.vx = 0;
    g.ship.vy = 0;
    g.ship.targetX = 130;
    g.ship.targetY = g.height / 2;
    g.ship.angle = 0;
    g.scoreVal = 0;
    g.timeAlive = 0;
    g.debris = [];
    g.particles = [];
    setDistance(0);
    setGameState('drifting');
    setLossReason('');
  }, []);

  // Main Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Internal virtual dimensions
    const width = Math.max(320, rect.width || 600);
    const height = Math.max(240, rect.height || 360);
    g.width = width;
    g.height = height;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    // Dynamic placement of nodes based on canvas dimensions
    g.gravityWell.x = width - 75;
    g.gravityWell.y = height - 75;
    g.roomPlanet.x = Math.max(220, width - 150);
    g.roomPlanet.y = 75;

    // Generate initial starfield
    if (g.stars.length === 0) {
      for (let i = 0; i < 50; i++) {
        g.stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.3 + 0.5,
          alpha: Math.random() * 0.6 + 0.25,
          speed: Math.random() * 0.25 + 0.06
        });
      }
    }

    let lastFrameTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const dt = Math.min(32, currentTime - lastFrameTime);
      lastFrameTime = currentTime;

      ctx.clearRect(0, 0, width, height);

      // 1. Deep Space Atmospheric Gradient
      const spaceGrad = ctx.createLinearGradient(0, 0, width, height);
      spaceGrad.addColorStop(0, '#060608');
      spaceGrad.addColorStop(0.5, '#0A0B10');
      spaceGrad.addColorStop(1, '#050507');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, width, height);

      // Celestial nebula drift around Room node
      const nebulaGrad = ctx.createRadialGradient(
        g.roomPlanet.x,
        g.roomPlanet.y,
        8,
        g.roomPlanet.x,
        g.roomPlanet.y,
        170
      );
      nebulaGrad.addColorStop(0, 'rgba(200, 169, 126, 0.14)');
      nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Render & Drift Starfield
      g.stars.forEach((star) => {
        star.x -= star.speed;
        if (star.x < 0) {
          star.x = width;
          star.y = Math.random() * height;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Render Gravity Well (Corner Hazard)
      const well = g.gravityWell;
      const wellPulse = Math.sin(currentTime * 0.003) * 3;

      // Concentric gravitational distortion rings
      for (let r = 1; r <= 3; r++) {
        const ringRadius = well.radius + r * 15 + wellPulse * (r * 0.8);
        ctx.beginPath();
        ctx.arc(well.x, well.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 95, 75, ${0.35 - r * 0.08})`;
        ctx.lineWidth = 1.25;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Outer gravitational pull aura
      const wellAura = ctx.createRadialGradient(well.x, well.y, 4, well.x, well.y, well.influenceRadius);
      wellAura.addColorStop(0, 'rgba(255, 80, 50, 0.28)');
      wellAura.addColorStop(0.35, 'rgba(255, 110, 70, 0.09)');
      wellAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = wellAura;
      ctx.beginPath();
      ctx.arc(well.x, well.y, well.influenceRadius, 0, Math.PI * 2);
      ctx.fill();

      // Dense hazard core
      const wellGrad = ctx.createRadialGradient(well.x, well.y, 2, well.x, well.y, well.radius);
      wellGrad.addColorStop(0, '#FF453A');
      wellGrad.addColorStop(0.7, '#FF7A45');
      wellGrad.addColorStop(1, '#B3261E');
      ctx.fillStyle = wellGrad;
      ctx.beginPath();
      ctx.arc(well.x, well.y, well.radius, 0, Math.PI * 2);
      ctx.fill();

      // Black center singularity
      ctx.fillStyle = '#08080A';
      ctx.beginPath();
      ctx.arc(well.x, well.y, well.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Gravity Well Label
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255, 140, 110, 0.85)';
      ctx.textAlign = 'right';
      ctx.fillText('GRAVITY WELL // DANGER', well.x - 22, well.y + 4);

      // 4. Render "Room" Planet (Reachable Objective / Win Node)
      const room = g.roomPlanet;
      room.beaconAngle += 0.02;
      const roomFloatY = room.y + Math.sin(currentTime * 0.002) * 5;

      // Soft beacon expansion waves
      const beaconWaveRadius = room.radius + 8 + (Math.sin(currentTime * 0.004) + 1) * 8;
      ctx.beginPath();
      ctx.arc(room.x, roomFloatY, beaconWaveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 169, 126, 0.45)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Outer gold halo
      const roomHalo = ctx.createRadialGradient(room.x, roomFloatY, 2, room.x, roomFloatY, room.radius * 1.8);
      roomHalo.addColorStop(0, 'rgba(200, 169, 126, 0.6)');
      roomHalo.addColorStop(1, 'rgba(200, 169, 126, 0)');
      ctx.fillStyle = roomHalo;
      ctx.beginPath();
      ctx.arc(room.x, roomFloatY, room.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Celestial Room Core
      ctx.fillStyle = '#C8A97E';
      ctx.beginPath();
      ctx.arc(room.x, roomFloatY, room.radius, 0, Math.PI * 2);
      ctx.fill();

      // Bright center beacon
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(room.x, roomFloatY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Room Node Label & Invite Code callback
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#C8A97E';
      ctx.textAlign = 'left';
      ctx.fillText(`ROOM ${room.code}`, room.x + room.radius + 10, roomFloatY - 2);

      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('SYNC BEACON', room.x + room.radius + 10, roomFloatY + 11);

      // 5. Update and Spawn Debris
      if (currentTime - g.lastSpawnTime > 1100 && g.debris.length < 8) {
        g.lastSpawnTime = currentTime;
        const fromTop = Math.random() > 0.5;
        const debRadius = Math.random() * 5 + 4;
        const debX = fromTop ? Math.random() * width : width + 10;
        const debY = fromTop ? -10 : Math.random() * height;
        const debAngle = Math.atan2(height * 0.6 - debY, width * 0.3 - debX) + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 0.7 + 0.4;

        // Generate rough polygon vertices
        const numVerts = 5;
        const verts = [];
        for (let v = 0; v < numVerts; v++) {
          const vAngle = (v / numVerts) * Math.PI * 2;
          const vDist = debRadius * (0.7 + Math.random() * 0.5);
          verts.push({
            x: Math.cos(vAngle) * vDist,
            y: Math.sin(vAngle) * vDist
          });
        }

        g.debris.push({
          x: debX,
          y: debY,
          vx: Math.cos(debAngle) * speed,
          vy: Math.sin(debAngle) * speed,
          radius: debRadius,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.03,
          vertices: verts
        });
      }

      // Render & Move Debris
      for (let i = g.debris.length - 1; i >= 0; i--) {
        const d = g.debris[i];
        d.x += d.vx;
        d.y += d.vy;
        d.rotation += d.rotSpeed;

        // Remove if off bounds
        if (d.x < -40 || d.x > width + 40 || d.y < -40 || d.y > height + 40) {
          g.debris.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);
        ctx.beginPath();
        d.vertices.forEach((pt, pIdx) => {
          if (pIdx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fillStyle = '#262630';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // 6. Ship Flight Physics (Drifting / Inertia)
      const ship = g.ship;

      if (gameState === 'drifting') {
        // Calculate distance towards cursor/touch target
        const dx = ship.targetX - ship.x;
        const dy = ship.targetY - ship.y;
        const distToTarget = Math.hypot(dx, dy);

        // Gentle acceleration curve with drift
        const accel = Math.min(0.28, distToTarget * 0.008);
        if (distToTarget > 2) {
          ship.vx += (dx / distToTarget) * accel;
          ship.vy += (dy / distToTarget) * accel;
        }

        // Apply space drag / inertia
        ship.vx *= 0.93;
        ship.vy *= 0.93;

        // 7. Gravitational Pull (Corner Hazard)
        const wellDx = well.x - ship.x;
        const wellDy = well.y - ship.y;
        const distToWell = Math.hypot(wellDx, wellDy);

        if (distToWell < well.influenceRadius && distToWell > 1) {
          // F = G * M / r^2 (clamped denominator prevents infinite pull)
          const pullForce = well.mass / Math.max(700, distToWell * distToWell);
          ship.vx += (wellDx / distToWell) * pullForce;
          ship.vy += (wellDy / distToWell) * pullForce;
        }

        // Apply velocity to position
        ship.x += ship.vx;
        ship.y += ship.vy;

        // Soft canvas boundary constraints
        ship.x = Math.max(12, Math.min(width - 12, ship.x));
        ship.y = Math.max(12, Math.min(height - 12, ship.y));

        // Point ship towards travel heading
        const speed = Math.hypot(ship.vx, ship.vy);
        if (speed > 0.3) {
          const targetAngle = Math.atan2(ship.vy, ship.vx) + Math.PI / 2;
          let diff = targetAngle - ship.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          ship.angle += diff * 0.15;
        }

        // Accumulate distance drifted
        g.timeAlive += dt;
        g.scoreVal += Math.round(speed * 0.8) + 1;
        setDistance(g.scoreVal);

        // Emit engine particle trail
        if (speed > 0.4 && Math.random() > 0.4) {
          const trailAngle = ship.angle + Math.PI / 2;
          g.particles.push({
            x: ship.x + Math.cos(trailAngle) * 8,
            y: ship.y + Math.sin(trailAngle) * 8,
            vx: -ship.vx * 0.2 + (Math.random() - 0.5) * 0.4,
            vy: -ship.vy * 0.2 + (Math.random() - 0.5) * 0.4,
            life: 0,
            maxLife: 18,
            color: 'rgba(200, 169, 126, 0.5)'
          });
        }

        // Collision Check: Gravity Well Event Horizon
        if (distToWell < well.radius + 6) {
          setGameState('lost');
          setLossReason('Pulled into gravity well');
          playCosmicSound('lost');
          for (let p = 0; p < 16; p++) {
            const pAngle = Math.random() * Math.PI * 2;
            const pSpeed = Math.random() * 2 + 1;
            g.particles.push({
              x: ship.x,
              y: ship.y,
              vx: Math.cos(pAngle) * pSpeed,
              vy: Math.sin(pAngle) * pSpeed,
              life: 0,
              maxLife: 28,
              color: '#FF6B4A'
            });
          }
        }

        // Collision Check: Space Debris
        for (let j = 0; j < g.debris.length; j++) {
          const deb = g.debris[j];
          const distToDeb = Math.hypot(deb.x - ship.x, deb.y - ship.y);
          if (distToDeb < deb.radius + 7) {
            setGameState('lost');
            setLossReason('Collided with drifting space debris');
            playCosmicSound('lost');
            for (let p = 0; p < 18; p++) {
              const pAngle = Math.random() * Math.PI * 2;
              const pSpeed = Math.random() * 2.2 + 0.8;
              g.particles.push({
                x: ship.x,
                y: ship.y,
                vx: Math.cos(pAngle) * pSpeed,
                vy: Math.sin(pAngle) * pSpeed,
                life: 0,
                maxLife: 26,
                color: '#C8A97E'
              });
            }
            break;
          }
        }

        // Check Win State: Reaching the "Room" Planet
        const distToRoom = Math.hypot(room.x - ship.x, roomFloatY - ship.y);
        if (distToRoom < room.radius + 14) {
          setGameState('synced');
          playCosmicSound('synced');
          if (g.scoreVal > highScore) {
            setHighScore(g.scoreVal);
            if (typeof window !== 'undefined') {
              localStorage.setItem('syncine-space-drift-high', g.scoreVal.toString());
            }
          }
          // Burst of beacon sync particles
          for (let p = 0; p < 25; p++) {
            const pAngle = Math.random() * Math.PI * 2;
            const pSpeed = Math.random() * 3 + 1;
            g.particles.push({
              x: room.x,
              y: roomFloatY,
              vx: Math.cos(pAngle) * pSpeed,
              vy: Math.sin(pAngle) * pSpeed,
              life: 0,
              maxLife: 35,
              color: '#C8A97E'
            });
          }
        }
      }

      // 8. Render Particles
      for (let p = g.particles.length - 1; p >= 0; p--) {
        const pt = g.particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        if (pt.life >= pt.maxLife) {
          g.particles.splice(p, 1);
          continue;
        }
        const pAlpha = 1 - pt.life / pt.maxLife;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pAlpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 9. Render Ship (SynIcons Geometric Glyph Style)
      if (gameState !== 'lost') {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        // Geometric delta ship matching SynCine icon language
        ctx.beginPath();
        ctx.moveTo(0, -10); // Forward tip
        ctx.lineTo(7.5, 8); // Right fin
        ctx.lineTo(0, 4); // Inset notch
        ctx.lineTo(-7.5, 8); // Left fin
        ctx.closePath();

        ctx.fillStyle = 'rgba(200, 169, 126, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#C8A97E';
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Central core playback pip
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      g.animFrameId = requestAnimationFrame(gameLoop);
    };

    g.animFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(g.animFrameId);
    };
  }, [gameState, highScore, playCosmicSound]);

  // Pointer & Touch Interaction Handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    gameRef.current.ship.targetX = x;
    gameRef.current.ship.targetY = y;
    gameRef.current.hasInteracted = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    gameRef.current.ship.targetX = x;
    gameRef.current.ship.targetY = y;
    gameRef.current.hasInteracted = true;
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6 text-center bg-[#F7F7F9] dark:bg-[#070709] text-[var(--text-primary)] select-none z-10 relative overflow-hidden transition-colors duration-300">
      {/* Background ambient canvas */}
      <ShaderCanvas />

      <div className="w-full max-w-2xl p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#121215]/95 border border-black/[0.08] dark:border-white/[0.12] flex flex-col items-center animate-enter-smooth relative z-10 shadow-2xl backdrop-blur-2xl transition-all duration-300">
        {/* Top Header Bar inside Card with Logo and Theme Toggle */}
        <div className="w-full flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SynLogo size={28} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#C8A97E]">
              SynCine Telemetry
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-1.5 sm:p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer flex items-center gap-1.5"
              title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
              aria-label="Toggle theme mode"
            >
              {isDark ? (
                <Sun size={14} className="text-amber-400" />
              ) : (
                <Moon size={14} className="text-indigo-500" />
              )}
              <span className="text-[10px] font-semibold hidden sm:inline text-[var(--text-secondary)]">
                {isDark ? 'Light' : 'Dark'}
              </span>
            </button>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-tight">
          Lost Sync with Mission Control
        </h1>

        <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed mb-4 max-w-md">
          {message} Guide your ship through the celestial debris field back to the broadcast beacon.
        </p>

        {/* The Interactive Celestial Flight Canvas */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-black/[0.12] dark:border-white/[0.12] bg-[#060608] shadow-inner mb-4">
          <canvas
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onTouchMove={handleTouchMove}
            style={{ touchAction: 'none' }}
            className="w-full h-[260px] sm:h-[340px] block cursor-crosshair"
          />

          {/* Top HUD Overlay */}
          <div className="absolute top-2.5 inset-x-3.5 flex items-center justify-between pointer-events-none text-xs text-white/80 font-mono">
            <div className="flex items-center gap-2">
              <Compass size={13} className="text-[#C8A97E] animate-spin-slow" />
              <span className="text-[11px] font-semibold tracking-wider text-white/90">
                DRIFT: {distance} LY
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/50">
                BEST: {Math.max(highScore, distance)} LY
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="pointer-events-auto p-1 text-white/60 hover:text-white rounded transition cursor-pointer"
                title={soundEnabled ? 'Mute celestial audio' : 'Unmute audio'}
              >
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
            </div>
          </div>

          {/* State Overlay: 404 Connection Lost */}
          {gameState === 'lost' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-enter-smooth z-20">
              <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                <Radio size={16} />
                <span className="text-xs font-mono font-bold uppercase tracking-widest">
                  404: Connection Lost
                </span>
              </div>
              <p className="text-xs text-white/75 mb-3 font-mono">
                {lossReason || 'Signal interrupted in deep space'}
              </p>
              <div className="text-[11px] text-white/50 mb-4 font-mono">
                Drift distance: <span className="text-white font-bold">{distance} LY</span>
              </div>
              <button
                type="button"
                onClick={handleRespawn}
                className="px-4 py-2 rounded-xl bg-[#C8A97E] hover:bg-[#D4B88F] text-black font-semibold text-xs flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer shadow"
              >
                <RotateCcw size={13} />
                <span>Re-align Trajectory</span>
              </button>
            </div>
          )}

          {/* State Overlay: Mission Success / Re-synced with Room */}
          {gameState === 'synced' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-enter-smooth z-20">
              <div className="flex items-center gap-1.5 text-[#C8A97E] mb-1">
                <Sparkles size={16} />
                <span className="text-xs font-mono font-bold uppercase tracking-widest">
                  Beacon Synchronized!
                </span>
              </div>
              <p className="text-xs text-white/85 mb-1 font-mono">
                Watchroom signal locked: <strong className="text-[#C8A97E]">/e89-ag8-zm5</strong>
              </p>
              <p className="text-[11px] text-white/50 mb-4 font-mono">
                Total drift: {distance} LY
              </p>
              <button
                type="button"
                onClick={onReturnHome}
                className="px-5 py-2.5 rounded-xl bg-[#C8A97E] hover:bg-[#D4B88F] text-black font-bold text-xs flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer shadow-lg"
              >
                <Radio size={14} />
                <span>Beam Me to Watchrooms</span>
              </button>
            </div>
          )}
        </div>

        {/* Accessibility Escape Hatch (Always Visible) */}
        <div className="w-full flex items-center justify-between text-xs pt-1 px-1">
          <span className="text-[10px] text-[var(--text-tertiary)] font-mono hidden sm:inline">
            Pilot ship with cursor or touch to reach the Room beacon
          </span>
          <button
            type="button"
            onClick={onReturnHome}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition flex items-center gap-1.5 cursor-pointer group py-1"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Watchrooms</span>
          </button>
        </div>
      </div>
    </main>
  );
};
