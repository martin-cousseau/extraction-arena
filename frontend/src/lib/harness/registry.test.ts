import { describe, expect, it } from 'vitest';
import { LAUNCHABLE_PIPELINES, PIPELINES } from './registry';

describe('LAUNCHABLE_PIPELINES', () => {
  it('offers only the native LlamaParse pipeline', () => {
    expect(LAUNCHABLE_PIPELINES.map((p) => p.id)).toEqual(['docai']);
    expect(LAUNCHABLE_PIPELINES[0].label).toBe('LlamaParse');
    expect(LAUNCHABLE_PIPELINES[0].deprecated).toBe(false);
    expect(PIPELINES.glm.deprecated).toBe(true);
  });
});
