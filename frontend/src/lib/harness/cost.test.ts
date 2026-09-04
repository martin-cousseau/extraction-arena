import { describe, expect, it } from 'vitest';
import { creditsToUsd, LLAMA_CREDIT_USD_PER_1000 } from './cost';

describe('creditsToUsd', () => {
  it('uses the published $1.25 per 1,000 credits rate', () => {
    expect(LLAMA_CREDIT_USD_PER_1000).toBe(1.25);
    expect(creditsToUsd(1000)).toBe(1.25);
    expect(creditsToUsd(75)).toBeCloseTo(0.09375);
  });

  it('treats missing usage as zero, never as billed', () => {
    expect(creditsToUsd(null)).toBe(0);
    expect(creditsToUsd(undefined)).toBe(0);
    expect(creditsToUsd(0)).toBe(0);
  });
});
