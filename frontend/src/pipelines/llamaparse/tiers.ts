export const LLAMA_EXTRACT_TIERS = ['cost_effective', 'agentic', 'agentic_plus', 'turbo'] as const;

export type LlamaExtractTier = (typeof LLAMA_EXTRACT_TIERS)[number];

export const DEFAULT_LLAMA_EXTRACT_TIER: LlamaExtractTier = 'agentic';

export const LLAMA_EXTRACT_TIER_LABELS: Record<LlamaExtractTier, string> = {
  cost_effective: 'Cost effective',
  agentic: 'Agentic',
  agentic_plus: 'Agentic plus',
  turbo: 'Turbo',
};

const TIER_SET = new Set<string>(LLAMA_EXTRACT_TIERS);

export function isLlamaExtractTier(value: unknown): value is LlamaExtractTier {
  return typeof value === 'string' && TIER_SET.has(value);
}

export function resolveLlamaExtractTier(value: unknown): LlamaExtractTier {
  return isLlamaExtractTier(value) ? value : DEFAULT_LLAMA_EXTRACT_TIER;
}
