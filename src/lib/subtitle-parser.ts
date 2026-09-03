/**
 * Subtitle parser for SubRip (.srt) and WebVTT (.vtt) files.
 * Provides high-speed binary lookup for active captions during synchronized playback.
 */

export interface SubtitleCue {
  id: string | number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

/**
 * Parses timestamp string "00:01:23.456" or "00:01:23,456" into seconds.
 */
export function parseTimestamp(timeStr: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().replace(',', '.');
  const parts = cleaned.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    if (isNaN(minutes) || isNaN(seconds)) return null;
    return minutes * 60 + seconds;
  }

  return null;
}

export const parseSrtTime = (timeStr: string): number => parseTimestamp(timeStr) ?? 0;
export const parseVttTime = (timeStr: string): number => parseTimestamp(timeStr) ?? 0;

/**
 * Formats seconds into human-readable "MM:SS" or "HH:MM:SS".
 */
export function formatSubtitleTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parses raw .srt or .vtt file content into an ordered array of SubtitleCues.
 */
export function parseSubtitleContent(rawContent: string): SubtitleCue[] {
  if (!rawContent || !rawContent.trim()) return [];

  // Normalize line endings
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;
    // Skip WEBVTT header blocks
    if (block.startsWith('WEBVTT') || block.startsWith('NOTE') || block.startsWith('STYLE')) {
      continue;
    }

    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    // Find the line containing the timing arrow "-->"
    let timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const [startRaw, endWithSettings] = timeLine.split('-->');
    if (!startRaw || !endWithSettings) continue;

    // Remove any WebVTT cue settings after the end timestamp (e.g. "00:02.000 line:80%")
    const endRaw = endWithSettings.trim().split(/\s+/)[0];

    const startTime = parseTimestamp(startRaw.trim());
    const endTime = parseTimestamp(endRaw);

    if (startTime === null || endTime === null || startTime >= endTime) {
      continue;
    }

    // Text lines are all lines following the timeline
    const textLines = lines.slice(timeLineIdx + 1);
    // Strip HTML formatting tags like <i>, <b>, <font>, <c.color>
    const cleanText = textLines
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (!cleanText) continue;

    const id = timeLineIdx > 0 ? lines[0] : cues.length + 1;

    cues.push({
      id,
      startTime,
      endTime,
      text: cleanText
    });
  }

  // Sort chronologically by start time
  return cues.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Fast binary search lookup for active subtitle cue given playback time and user offset.
 */
export function findActiveCue(
  cues: SubtitleCue[],
  currentTime: number,
  offsetSeconds: number = 0
): SubtitleCue | null {
  if (!cues || cues.length === 0) return null;

  const adjustedTime = currentTime + offsetSeconds;
  if (adjustedTime < 0) return null;

  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cue = cues[mid];

    if (adjustedTime >= cue.startTime && adjustedTime <= cue.endTime) {
      return cue;
    }

    if (adjustedTime < cue.startTime) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return null;
}
