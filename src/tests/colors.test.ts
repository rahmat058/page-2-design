import { describe, expect, it } from 'vitest';
import { parseColor, inferColorRole } from '../normalize/colors';

describe('color parsing', () => {
  it('parses hex, rgb, hsl, and named colors', () => {
    expect(parseColor('#1d4ed8')?.hex).toBe('#1D4ED8');
    expect(parseColor('#fff')?.hex).toBe('#FFFFFF');
    expect(parseColor('rgb(29, 78, 216)')?.rgba).toBe('rgba(29, 78, 216, 1)');
    expect(parseColor('rgba(0,0,0,0.5)')?.a).toBe(0.5);
    expect(parseColor('hsl(224, 76%, 48%)')).not.toBeNull();
    expect(parseColor('black')?.hex).toBe('#000000');
    expect(parseColor('transparent')?.a).toBe(0);
  });

  it('parses oklch', () => {
    const parsed = parseColor('oklch(0.6 0.1 250)');
    expect(parsed).not.toBeNull();
    expect(parsed?.oklch.startsWith('oklch(')).toBe(true);
  });

  it('rejects unsupported values', () => {
    expect(parseColor('currentcolor')).toBeNull();
    expect(parseColor('color(display-p3 1 0 0)')).toBeNull();
  });

  it('infers roles without claiming certainty', () => {
    expect(inferColorRole('#111111', ['color'])).toBe('text');
    expect(inferColorRole('#FFFFFF', ['background-color'])).toBe('surface');
  });
});
