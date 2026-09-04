import { describe, expect, it } from 'vitest';
import { formatPct } from './utils';

describe('formatPct', () => {
  it('renders 0–1 rates as whole percents', () => {
    expect(formatPct(0)).toBe('0%');
    expect(formatPct(1)).toBe('100%');
    expect(formatPct(0.874)).toBe('87%');
    expect(formatPct(0.875)).toBe('88%');
  });

  it('clamps out of range and rejects non-finite', () => {
    expect(formatPct(-0.2)).toBe('0%');
    expect(formatPct(1.4)).toBe('100%');
    expect(formatPct(Number.NaN)).toBe('—');
  });
});
