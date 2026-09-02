import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SynLogo } from './icons/SynIcons';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Trophy, Play } from 'lucide-react';

interface NotFoundProps {
  onReturnHome: () => void;
  message?: string;
}

export const NotFound: React.FC<NotFoundProps> = ({
  onReturnHome,
  message = 'The requested watchroom or page could not be located.'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('syncine-reel-highscore') || '0', 10);
    }
    return 0;
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game internal mutable state
  const gameRef = useRef({
    reelY: 0,
    velocity: 0,
    gravity: 0.6,
    jumpStrength: -10.5,
    isGrounded: true,
    rotation: 0,
    obstacles: [] as Array<{ x: number; width: number; height: number }>,
    bonuses: [] as Array<{ x: number; y: number; collected: boolean }>,
    frameSpeed: 4.5,
    distance: 0,
    scoreVal: 0,
    highScoreVal: 0,
    audioCtx: null as AudioContext | null,
    animationId: 0,
    lastObstacleDist: 0,
  });

  // Sound synthesizer using Web Audio API (Zero external assets)
  const playSound = useCallback((type: 'jump' | 'collect' | 'crash') => {
    if (!soundEnabled) return;
    try {
      if (!gameRef.current.audioCtx) {
        gameRef.current.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = gameRef.current.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'collect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1320, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  }, [soundEnabled]);

  const jump = useCallback(() => {
    const g = gameRef.current;
    if (g.isGrounded) {
      g.velocity = g.jumpStrength;
      g.isGrounded = false;
      playSound('jump');
    }
  }, [playSound]);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const groundY = canvas.height - 40;

    gameRef.current = {
      ...gameRef.current,
      reelY: groundY - 16,
      velocity: 0,
      gravity: 0.6,
      jumpStrength: -10.5,
      isGrounded: true,
      rotation: 0,
      obstacles: [
        { x: canvas.width + 120, width: 22, height: 28 },
        { x: canvas.width + 380, width: 26, height: 36 }
      ],
      bonuses: [
        { x: canvas.width + 250, y: groundY - 55, collected: false }
      ],
      frameSpeed: 4.5,
      distance: 0,
      scoreVal: 0,
      lastObstacleDist: 0,
    };

    setScore(0);
    setGameState('playing');
  }, []);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const reelRadius = 16;
    const groundY = canvas.height - 40;

    const gameLoop = () => {
      const g = gameRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Film Strip Track with Sprocket Perforations
      ctx.fillStyle = 'rgba(128, 128, 128, 0.15)';
      ctx.fillRect(0, groundY, canvas.width, 40);

      // Sprocket holes along the film strip
      ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
      const sprocketSpacing = 28;
      const sprocketOffset = -(g.distance % sprocketSpacing);
      for (let x = sprocketOffset; x < canvas.width + sprocketSpacing; x += sprocketSpacing) {
        ctx.fillRect(x + 6, groundY + 8, 10, 14);
      }

      // Track Divider Line
      ctx.strokeStyle = 'rgba(200, 169, 126, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();

      if (gameState === 'playing') {
        // Physics update
        g.velocity += g.gravity;
        g.reelY += g.velocity;

        if (g.reelY >= groundY - reelRadius) {
          g.reelY = groundY - reelRadius;
          g.velocity = 0;
          g.isGrounded = true;
        }

        // Distance & score tracking
        g.distance += g.frameSpeed;
        g.rotation += (g.frameSpeed * 0.08);
        g.scoreVal = Math.floor(g.distance / 10);
        setScore(g.scoreVal);

        // Gradually ramp speed every 250 points
        g.frameSpeed = 4.5 + Math.min(4.0, (g.scoreVal / 250) * 0.6);

        // Spawn obstacles
        if (g.distance - g.lastObstacleDist > 220 + Math.random() * 180) {
          const obsHeight = 22 + Math.floor(Math.random() * 20);
          g.obstacles.push({
            x: canvas.width + 40,
            width: 20 + Math.floor(Math.random() * 10),
            height: obsHeight,
          });

          // Occasionally spawn a collectible star above obstacle
          if (Math.random() > 0.4) {
            g.bonuses.push({
              x: canvas.width + 120,
              y: groundY - (40 + Math.random() * 35),
              collected: false
            });
          }

          g.lastObstacleDist = g.distance;
        }

        // Move & Check Obstacles
        for (let i = g.obstacles.length - 1; i >= 0; i--) {
          const obs = g.obstacles[i];
          obs.x -= g.frameSpeed;

          // Draw Glitch Static Obstacle
          ctx.fillStyle = 'rgba(255, 69, 58, 0.85)';
          ctx.fillRect(obs.x, groundY - obs.height, obs.width, obs.height);

          // Top glint
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillRect(obs.x, groundY - obs.height, obs.width, 2);

          // Collision check (circle vs rectangle)
          const reelX = 64;
          const closestX = Math.max(obs.x, Math.min(reelX, obs.x + obs.width));
          const closestY = Math.max(groundY - obs.height, Math.min(g.reelY, groundY));
          const distX = reelX - closestX;
          const distY = g.reelY - closestY;
          const distanceSquared = distX * distX + distY * distY;

          if (distanceSquared < (reelRadius - 2) * (reelRadius - 2)) {
            // Collision!
            playSound('crash');
            setGameState('gameover');
            if (g.scoreVal > highScore) {
              setHighScore(g.scoreVal);
              localStorage.setItem('syncine-reel-highscore', g.scoreVal.toString());
            }
            return;
          }

          if (obs.x + obs.width < -20) {
            g.obstacles.splice(i, 1);
          }
        }

        // Move & Check Collectible Stars
        for (let i = g.bonuses.length - 1; i >= 0; i--) {
          const b = g.bonuses[i];
          b.x -= g.frameSpeed;

          if (!b.collected) {
            // Draw Gold Sync Diamond
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(g.rotation * 1.5);
            ctx.fillStyle = '#C8A97E';
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(7, 0);
            ctx.lineTo(0, 7);
            ctx.lineTo(-7, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Collision check
            const reelX = 64;
            const dist = Math.hypot(reelX - b.x, g.reelY - b.y);
            if (dist < reelRadius + 8) {
              b.collected = true;
              g.distance += 500; // Bonus +50 score
              playSound('collect');
            }
          }

          if (b.x < -20) {
            g.bonuses.splice(i, 1);
          }
        }
      }

      // 2. Draw Rolling Gold Cinema Film Reel
      const reelX = 64;
      ctx.save();
      ctx.translate(reelX, g.reelY);
      ctx.rotate(g.rotation);

      // Outer Reel Rim
      ctx.strokeStyle = '#C8A97E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, reelRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Reel Film Core
      ctx.fillStyle = '#C8A97E';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      // Reel Spokes (3 symmetric film holes)
      for (let i = 0; i < 3; i++) {
        const spokeAngle = (i * Math.PI * 2) / 3;
        ctx.fillStyle = 'rgba(200, 169, 126, 0.6)';
        ctx.beginPath();
        ctx.arc(Math.cos(spokeAngle) * 9, Math.sin(spokeAngle) * 9, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState, highScore, playSound]);

  // Handle keyboard controls (Space / ArrowUp)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'playing') {
          jump();
        } else {
          startGame();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, jump, startGame]);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-3.5 sm:p-6 text-center bg-white dark:bg-black select-none z-10 relative">
      <div className="w-full max-w-lg p-5 sm:p-8 rounded-2xl sm:rounded-3xl realistic-glass flex flex-col items-center animate-enter-smooth">
        <SynLogo size={38} className="mb-2.5 sm:w-11 sm:h-11" />

        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-1">
          404 Not Found
        </span>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
          Lost in the Theater
        </h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6 max-w-sm">
          {message} While we realign the projector, keep the film reel rolling!
        </p>

        {/* Interactive Canvas Arcade Game */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.1] bg-black/40 mb-5 shadow-inner">
          <canvas
            ref={canvasRef}
            width={480}
            height={160}
            onClick={() => {
              if (gameState === 'playing') jump();
              else startGame();
            }}
            className="w-full h-auto block cursor-pointer"
          />

          {/* Overlay UI during Idle or Game Over */}
          {gameState !== 'playing' && (
            <div
              onClick={startGame}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 cursor-pointer"
            >
              {gameState === 'idle' ? (
                <div className="flex flex-col items-center">
                  <div className="p-3 rounded-full bg-[var(--accent)] text-black mb-2 shadow-lg transition-transform hover:scale-110">
                    <Play size={20} className="fill-current ml-0.5" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Press Space or Tap to Play
                  </span>
                  <span className="text-[11px] text-white/60 mt-1">
                    Jump over glitches and collect sync diamonds
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center animate-enter-smooth">
                  <span className="text-sm font-bold text-[var(--destructive)] tracking-wider mb-1 uppercase">
                    Glitch Detected!
                  </span>
                  <span className="text-xs text-white/80 mb-3">
                    Final Score: <strong className="text-white">{score}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startGame();
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-semibold text-xs flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer shadow"
                  >
                    <RotateCcw size={13} />
                    <span>Roll Again</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Live HUD Bar */}
          <div className="absolute top-2.5 inset-x-3 flex items-center justify-between pointer-events-none text-xs text-white/80 font-medium">
            <div className="flex items-center gap-1">
              <Trophy size={13} className="text-[var(--accent)]" />
              <span className="text-[11px]">Best: {highScore}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{score}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSoundEnabled(!soundEnabled);
                }}
                className="pointer-events-auto p-1 text-white/60 hover:text-white rounded transition cursor-pointer"
                title={soundEnabled ? 'Mute game sound' : 'Unmute game sound'}
              >
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onReturnHome}
          className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm group hover:scale-[1.01]"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Return to Watchrooms</span>
        </button>
      </div>
    </main>
  );
};
