import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LLAMA_EXTRACT_TIER,
  isLlamaExtractTier,
  LLAMA_EXTRACT_TIERS,
  resolveLlamaExtractTier,
} from './tiers';

describe('LlamaParse extract tiers', () => {
  it('lists the four LlamaExtract tiers in API order', () => {
    expect(LLAMA_EXTRACT_TIERS).toEqual(['cost_effective', 'agentic', 'agentic_plus', 'turbo']);
    expect(DEFAULT_LLAMA_EXTRACT_TIER).toBe('agentic');
  });

  it('rejects unknown values and falls back to agentic', () => {
    expect(isLlamaExtractTier('turbo')).toBe(true);
    expect(isLlamaExtractTier('fast')).toBe(false);
    expect(resolveLlamaExtractTier('agentic_plus')).toBe('agentic_plus');
    expect(resolveLlamaExtractTier('fast')).toBe('agentic');
    expect(resolveLlamaExtractTier(undefined)).toBe('agentic');
  });
});
