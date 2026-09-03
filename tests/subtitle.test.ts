import { describe, it, expect } from 'vitest';
import {
  parseSubtitleContent,
  parseSrtTime,
  parseVttTime,
  findActiveCue,
  formatSubtitleTime
} from '../src/lib/subtitle-parser';

describe('Subtitle Parser and Sync Calibration Suite', () => {
  const sampleSrt = `1
00:00:01,000 --> 00:00:04,500
Welcome to SynCine Watchroom!

2
00:00:05,200 --> 00:00:08,800
Enjoy your movie together in perfect sync.
`;

  const sampleVtt = `WEBVTT

1
00:01.000 --> 00:04.500
Welcome to SynCine Watchroom!

2
01:05.200 --> 01:08.800
Enjoy your movie together in perfect sync.
`;

  it('correctly parses timestamps in SRT format', () => {
    expect(parseSrtTime('00:00:01,000')).toBe(1);
    expect(parseSrtTime('01:02:03,500')).toBe(3723.5);
    expect(parseSrtTime('invalid')).toBe(0);
  });

  it('correctly parses timestamps in WebVTT format', () => {
    expect(parseVttTime('00:01.000')).toBe(1);
    expect(parseVttTime('01:02:03.500')).toBe(3723.5);
    expect(parseVttTime('invalid')).toBe(0);
  });

  it('parses SubRip (.srt) subtitle documents into structured cues', () => {
    const cues = parseSubtitleContent(sampleSrt);
    expect(cues).toHaveLength(2);
    expect(cues[0].startTime).toBe(1.0);
    expect(cues[0].endTime).toBe(4.5);
    expect(cues[0].text).toBe('Welcome to SynCine Watchroom!');
    expect(cues[1].startTime).toBe(5.2);
    expect(cues[1].endTime).toBe(8.8);
    expect(cues[1].text).toBe('Enjoy your movie together in perfect sync.');
  });

  it('parses WebVTT (.vtt) subtitle documents into structured cues', () => {
    const cues = parseSubtitleContent(sampleVtt);
    expect(cues).toHaveLength(2);
    expect(cues[0].startTime).toBe(1.0);
    expect(cues[0].endTime).toBe(4.5);
    expect(cues[0].text).toBe('Welcome to SynCine Watchroom!');
  });

  it('finds active cue with binary search precision and handles sync offsets', () => {
    const cues = parseSubtitleContent(sampleSrt);

    // Exact hit with 0 offset
    const activeCue = findActiveCue(cues, 2.5, 0);
    expect(activeCue).not.toBeNull();
    expect(activeCue?.text).toBe('Welcome to SynCine Watchroom!');

    // In between cues
    expect(findActiveCue(cues, 4.8, 0)).toBeNull();

    // Hit with positive offset (+1.0s advances the cue window earlier)
    const offsetCue = findActiveCue(cues, 0.5, 1.0);
    expect(offsetCue).not.toBeNull();
    expect(offsetCue?.text).toBe('Welcome to SynCine Watchroom!');
  });

  it('formats subtitle timestamps cleanly for user displays', () => {
    expect(formatSubtitleTime(65)).toBe('01:05');
    expect(formatSubtitleTime(3665)).toBe('01:01:05');
    expect(formatSubtitleTime(-10)).toBe('00:00');
  });
});
