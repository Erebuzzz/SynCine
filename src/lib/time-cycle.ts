/**
 * Real-Time Day/Night Cycle & Solar Reflection System
 *
 * Automatically synchronizes visual themes with the real-world clock:
 * - Daytime (06:00 to 18:30): Light Mode with morning and afternoon solar sheen.
 * - Nighttime (18:30 to 06:00): OLED Cinema Dark Mode with moonlit specular reflection.
 *
 * Supports three theme modes:
 * - 'auto': Real-time dynamic day/night mode tracking the live clock.
 * - 'light': Forced Light Mode.
 * - 'dark': Forced OLED Dark Mode.
 */

export type ThemeMode = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'syncine-theme-mode';

export interface ISTCycleState {
  isDaytime: boolean;
  hours: number;
  minutes: number;
  reflectionAngle: number;
  specularOpacity: number;
  timeLabel: string;
}

/**
 * Formats a Date object into 12-hour time format (e.g., "9:58 AM", "12:05 PM").
 */
export function format12HourTime(date: Date = new Date()): string {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // Hour '0' is 12 AM
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Returns whether the current device local time corresponds to daytime (06:00 to 18:30).
 * Sunrise = 06:00 (360 min), Sunset = 18:30 (1110 min).
 */
export function isCurrentlyDaytime(): boolean {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  return totalMinutes >= 360 && totalMinutes < 1110;
}

/**
 * Resolves whether dark mode should be enabled based on user's theme mode.
 */
export function resolveThemeIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  // 'auto' mode: Light during daytime, Dark at nighttime
  return !isCurrentlyDaytime();
}

/**
 * Retrieves the saved theme mode, defaulting to 'auto' for real-time day/night sync.
 */
export function getSavedThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'auto') {
    return saved;
  }
  // Remove legacy key if present to allow smooth migration to real-time auto mode
  localStorage.removeItem('syncine-theme-manual');
  return 'auto';
}

/**
 * Saves the selected theme mode to localStorage.
 */
export function setSavedThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  localStorage.removeItem('syncine-theme-manual');
  window.dispatchEvent(new CustomEvent('syncine-theme-change', { detail: { mode } }));
}

export function getISTCycleState(): ISTCycleState {
  const now = new Date();
  // Get current UTC timestamp in milliseconds
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  // Convert to Indian Standard Time (UTC + 5:30)
  const istDate = new Date(utcMs + 5.5 * 3600000);

  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Sunrise = 06:00 (360 minutes), Sunset = 18:30 (1110 minutes)
  const isDaytime = totalMinutes >= 360 && totalMinutes < 1110;

  // Calculate dynamic glass reflection angle and sheen intensity
  let reflectionAngle = 135;
  let specularOpacity = 0.12;

  if (totalMinutes >= 360 && totalMinutes < 720) {
    // Morning (06:00 - 12:00 IST): East sunlight sweeping from 110deg to 135deg
    const progress = (totalMinutes - 360) / 360;
    reflectionAngle = Math.round(110 + progress * 25);
    specularOpacity = 0.18 + progress * 0.05;
  } else if (totalMinutes >= 720 && totalMinutes < 1110) {
    // Afternoon to Sunset (12:00 - 18:30 IST): West sunlight sweeping from 135deg to 165deg
    const progress = (totalMinutes - 720) / 390;
    reflectionAngle = Math.round(135 + progress * 30);
    specularOpacity = 0.22 - progress * 0.08;
  } else {
    // Night (18:30 - 06:00 IST): Moonlit specular reflection at fixed 135deg with delicate cool sheen
    reflectionAngle = 135;
    specularOpacity = 0.08;
  }

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const timeLabel = `${formattedHours}:${formattedMinutes} IST`;

  return {
    isDaytime,
    hours,
    minutes,
    reflectionAngle,
    specularOpacity,
    timeLabel,
  };
}

/**
 * Applies the solar reflection variables directly to documentElement CSS
 */
export function applyISTReflectionCSS(state: ISTCycleState, isDark: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--reflection-angle', `${state.reflectionAngle}deg`);

  if (isDark) {
    // In dark mode, clamp specular reflection to a delicate sheen (0.05 max) to prevent milky white glaze
    const darkSpecular = Math.min(state.specularOpacity, 0.05);
    root.style.setProperty(
      '--glass-reflection-gradient',
      `linear-gradient(${state.reflectionAngle}deg, rgba(255, 255, 255, ${darkSpecular}) 0%, rgba(255, 255, 255, 0.01) 40%, rgba(255, 255, 255, 0) 100%)`
    );
    root.style.setProperty('--glass-specular-edge', 'rgba(255, 255, 255, 0.12)');
  } else {
    root.style.setProperty(
      '--glass-reflection-gradient',
      `linear-gradient(${state.reflectionAngle}deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.2) 40%, rgba(255, 255, 255, 0) 100%)`
    );
    root.style.setProperty('--glass-specular-edge', 'rgba(255, 255, 255, 0.8)');
  }
}
