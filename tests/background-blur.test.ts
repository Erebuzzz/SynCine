import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BLUR_PRESETS,
  MAX_BLUR_RADIUS,
  getStoredBlurRadius,
  setStoredBlurRadius,
  BackgroundBlurEngine
} from '../src/lib/background-blur';

describe('Background Blur Engine Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defines valid blur presets and max radius boundaries', () => {
    expect(BLUR_PRESETS.OFF).toBe(0);
    expect(BLUR_PRESETS.SUBTLE).toBe(8);
    expect(BLUR_PRESETS.PORTRAIT).toBe(16);
    expect(BLUR_PRESETS.DEEP).toBe(24);
    expect(MAX_BLUR_RADIUS).toBe(32);
  });

  it('defaults stored blur radius to OFF (0) when nothing is saved', () => {
    expect(getStoredBlurRadius()).toBe(0);
  });

  it('correctly persists and clamps blur radius in localStorage', () => {
    setStoredBlurRadius(16);
    expect(getStoredBlurRadius()).toBe(16);

    // Negative radius should clamp to 0
    setStoredBlurRadius(-5);
    expect(getStoredBlurRadius()).toBe(0);

    // Excessive radius should clamp to MAX_BLUR_RADIUS (32)
    setStoredBlurRadius(99);
    expect(getStoredBlurRadius()).toBe(MAX_BLUR_RADIUS);
  });

  it('manages blur state and isEnabled flag accurately', () => {
    const engine = new BackgroundBlurEngine();
    expect(engine.isEnabled()).toBe(false);
    expect(engine.getBlurRadius()).toBe(0);

    engine.setBlurRadius(BLUR_PRESETS.PORTRAIT);
    expect(engine.isEnabled()).toBe(true);
    expect(engine.getBlurRadius()).toBe(16);

    engine.setBlurRadius(0);
    expect(engine.isEnabled()).toBe(false);
    expect(engine.getBlurRadius()).toBe(0);

    engine.destroy();
  });
});
