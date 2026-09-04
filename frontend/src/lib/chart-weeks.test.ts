import { describe, expect, it } from 'vitest';
import { formatWeekTick, startOfLocalWeek, weekStartsFromFirstToLast } from './chart-weeks';

describe('weekStartsFromFirstToLast', () => {
  it('returns no weeks when there is no data', () => {
    expect(weekStartsFromFirstToLast([])).toEqual([]);
  });

  it('starts at the week of the first point, not January', () => {
    const first = new Date(2026, 8, 4, 15, 0, 0); // Fri 4 Sep 2026
    const weeks = weekStartsFromFirstToLast([first.getTime()]);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toEqual(startOfLocalWeek(first));
    expect(weeks[0].getMonth()).toBe(7); // August — Monday 31 Aug
    expect(weeks[0].getDate()).toBe(31);
  });

  it('fills contiguous weeks through the last point', () => {
    const first = new Date(2026, 8, 4).getTime(); // Fri 4 Sep
    const last = new Date(2026, 8, 20).getTime(); // Sun 20 Sep
    const weeks = weekStartsFromFirstToLast([last, first]);
    expect(weeks.map((d) => formatWeekTick(d))).toEqual([
      formatWeekTick(startOfLocalWeek(first)),
      formatWeekTick(new Date(2026, 8, 7)),
      formatWeekTick(startOfLocalWeek(last)),
    ]);
  });

  it('keeps same-week timestamps in one bucket', () => {
    const a = new Date(2026, 8, 1, 9).getTime();
    const b = new Date(2026, 8, 4, 18).getTime();
    expect(weekStartsFromFirstToLast([a, b])).toHaveLength(1);
  });
});
