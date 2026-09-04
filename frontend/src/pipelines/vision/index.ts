import { PlaceholderLogo } from '../shared/placeholder-logo';
import type { PipelineDefinition } from '../types';
import { runVisionExtract } from './adapter';

function visionPipeline(
  id: 'glm' | 'gpt' | 'grok',
  label: string,
  description: string
): PipelineDefinition {
  return {
    id,
    label,
    description,
    deprecated: true,
    kind: 'vision',
    requiresPdf: false,
    Logo: PlaceholderLogo,
    extract: (input, options) => runVisionExtract(id, input, options),
  };
}

export const glmPipeline = visionPipeline(
  'glm',
  'GLM-5V-Turbo',
  'Deprecated vision pipeline via Z.AI.'
);

export const gptPipeline = visionPipeline(
  'gpt',
  'GPT-5.4 mini',
  'Deprecated vision pipeline via OpenAI.'
);

export const grokPipeline = visionPipeline(
  'grok',
  'Grok 4.5',
  'Deprecated vision pipeline via xAI.'
);
