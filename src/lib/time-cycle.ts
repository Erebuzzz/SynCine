/**
 * Indian Standard Time (IST) Day/Night Cycle & Solar Position Tracker
 *
 * IST is UTC+5:30.
 * In India:
 * - Sunrise is approximately 06:00 IST
 * - Sunset is approximately 18:30 IST
 *
 * Daytime (06:00 to 18:30 IST): Automatically suggests Light Mode.
 * Nighttime (18:30 to 06:00 IST): Automatically suggests Dark Mode.
 *
 * The solar reflection angle also continuously sweeps across glassmorphic surfaces
 * to simulate realistic ambient light reflection based on the time of day.
 */

export interface ISTCycleState {
  isDaytime: boolean;
  hours: number;
  minutes: number;
  reflectionAngle: number;
  specularOpacity: number;
  timeLabel: string;
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
 * Applies the IST reflection variables directly to documentElement CSS
 */
export function applyISTReflectionCSS(state: ISTCycleState, isDark: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--reflection-angle', `${state.reflectionAngle}deg`);

  if (isDark) {
    root.style.setProperty(
      '--glass-reflection-gradient',
      `linear-gradient(${state.reflectionAngle}deg, rgba(255, 255, 255, ${state.specularOpacity}) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(255, 255, 255, 0) 100%)`
    );
    root.style.setProperty('--glass-specular-edge', 'rgba(255, 255, 255, 0.14)');
  } else {
    root.style.setProperty(
      '--glass-reflection-gradient',
      `linear-gradient(${state.reflectionAngle}deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.2) 40%, rgba(255, 255, 255, 0) 100%)`
    );
    root.style.setProperty('--glass-specular-edge', 'rgba(255, 255, 255, 0.8)');
  }
}
