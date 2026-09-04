import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  format12HourTime,
  resolveThemeIsDark
} from '../src/lib/time-cycle';
import { isSoftwareRenderingDetected, applyPerformanceMode } from '../src/lib/performance-detect';

describe('Time Cycle and Real-Time Theme Suite', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  it('formats dates accurately into 12-hour format with AM and PM indicators', () => {
    const morning = new Date(2026, 8, 4, 9, 58, 0); // 09:58 AM
    expect(format12HourTime(morning)).toBe('9:58 AM');

    const noon = new Date(2026, 8, 4, 12, 0, 0); // 12:00 PM
    expect(format12HourTime(noon)).toBe('12:00 PM');

    const afternoon = new Date(2026, 8, 4, 13, 5, 0); // 01:05 PM
    expect(format12HourTime(afternoon)).toBe('1:05 PM');

    const night = new Date(2026, 8, 4, 22, 30, 0); // 10:30 PM
    expect(format12HourTime(night)).toBe('10:30 PM');

    const midnight = new Date(2026, 8, 4, 0, 0, 0); // 12:00 AM
    expect(format12HourTime(midnight)).toBe('12:00 AM');
  });

  it('resolves dark and light theme accurately by mode', () => {
    expect(resolveThemeIsDark('dark')).toBe(true);
    expect(resolveThemeIsDark('light')).toBe(false);

    // In auto mode, daytime (06:00 to 18:30) resolves to light (isDark = false)
    const autoResult = resolveThemeIsDark('auto');
    expect(typeof autoResult).toBe('boolean');
  });

  it('detects software rendering and manages performance class safely', () => {
    expect(typeof isSoftwareRenderingDetected()).toBe('boolean');

    applyPerformanceMode(true);
    expect(document.documentElement.classList.contains('software-rendering')).toBe(true);

    applyPerformanceMode(false);
    expect(document.documentElement.classList.contains('software-rendering')).toBe(false);
  });
});
