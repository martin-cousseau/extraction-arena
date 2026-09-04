import { Radio, RadioGroup } from '@/components/base/radio/radio';
import {
  LLAMA_EXTRACT_TIER_LABELS,
  LLAMA_EXTRACT_TIERS,
  type LlamaExtractTier,
} from './tiers';

export function LlamaParseTierRadios({
  value,
  onChange,
}: {
  value: LlamaExtractTier;
  onChange: (tier: LlamaExtractTier) => void;
}) {
  return (
    <RadioGroup
      aria-label="Extract tier"
      name="llamaparse-extract-tier"
      value={value}
      onChange={(next) => onChange(next as LlamaExtractTier)}
      className="grid grid-cols-2 gap-x-3 gap-y-2"
    >
      {LLAMA_EXTRACT_TIERS.map((tier) => (
        <Radio key={tier} value={tier} size="sm">
          {LLAMA_EXTRACT_TIER_LABELS[tier]}
        </Radio>
      ))}
    </RadioGroup>
  );
}
