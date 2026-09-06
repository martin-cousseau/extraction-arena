import { describe, expect, it } from 'vitest';
import { orderSectionPoints } from './run-quality-charts';

describe('orderSectionPoints', () => {
  const points = [
    { id: 'warnings', label: 'Warnings', value: 0.82 },
    { id: 'identification', label: 'Identification', value: 0.41 },
    { id: 'battery', label: 'Battery', value: 0.41 },
    { id: 'rescue', label: 'Rescue', value: 0.95 },
  ];

  it('keeps section order in normal mode', () => {
    expect(orderSectionPoints(points, 'normal')).toBe(points);
  });

  it('sorts from low to high and breaks ties by label', () => {
    expect(orderSectionPoints(points, 'value-asc').map((point) => point.id)).toEqual([
      'battery',
      'identification',
      'warnings',
      'rescue',
    ]);
  });

  it('does not mutate the original list', () => {
    const copy = [...points];
    orderSectionPoints(points, 'value-asc');
    expect(points).toEqual(copy);
  });
});
