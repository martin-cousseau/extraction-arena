/** Local Monday 00:00 for the week containing `date`. */
export function startOfLocalWeek(date: Date | number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

export function weekKey(date: Date | number): number {
  return startOfLocalWeek(date).getTime();
}

/**
 * Inclusive Monday-start weeks from the earliest timestamp through the latest.
 * Empty input yields no weeks — the axis does not pad to January or today.
 */
export function weekStartsFromFirstToLast(timestamps: number[]): Date[] {
  if (timestamps.length === 0) return [];
  let min = timestamps[0];
  let max = timestamps[0];
  for (let i = 1; i < timestamps.length; i++) {
    const t = timestamps[i];
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const end = startOfLocalWeek(max).getTime();
  const weeks: Date[] = [];
  const cursor = startOfLocalWeek(min);
  while (cursor.getTime() <= end) {
    weeks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

export function formatWeekTick(date: Date, withYear = false): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: '2-digit' } : {}),
  });
}
