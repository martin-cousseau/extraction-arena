import type { PipelineDefinition } from '../types';
import { runLlamaparseExtract } from './adapter';
import { LlamaParseLogo } from './logo';
import { llamaExtractDataSchema } from './schema';

/** Persisted run id stays `docai` so IndexedDB history keeps resolving. */
export const llamaparsePipeline: PipelineDefinition = {
  id: 'docai',
  label: 'LlamaParse',
  description: 'Native LlamaExtract pipeline.',
  deprecated: false,
  kind: 'native',
  requiresPdf: true,
  Logo: LlamaParseLogo,
  dataSchema: llamaExtractDataSchema,
  extract: (input, options) => runLlamaparseExtract(input, options, llamaExtractDataSchema()),
};

export { llamaExtractDataSchema, isEnvelopeKey, llamaExtractIncompatibilities } from './schema';
export { LlamaParseLogo } from './logo';
export {
  DEFAULT_LLAMA_EXTRACT_TIER,
  LLAMA_EXTRACT_TIER_LABELS,
  LLAMA_EXTRACT_TIERS,
  resolveLlamaExtractTier,
  type LlamaExtractTier,
} from './tiers';
