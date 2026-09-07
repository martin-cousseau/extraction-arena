import type { ComponentType } from 'react';
import type { PipelineDefinition } from '../types';
import { runVisionExtract } from './adapter';
import { OpenAiLogo, XaiLogo, ZaiLogo } from './logos';

function visionPipeline(
  id: 'glm' | 'gpt' | 'grok',
  label: string,
  description: string,
  Logo: ComponentType<{ className?: string }>
): PipelineDefinition {
  return {
    id,
    label,
    description,
    deprecated: false,
    kind: 'vision',
    requiresPdf: false,
    Logo,
    extract: (input, options) => runVisionExtract(id, input, options),
  };
}

export const glmPipeline = visionPipeline(
  'glm',
  'GLM-5V-Turbo',
  'Z.AI vision extraction via GLM-5V-Turbo.',
  ZaiLogo
);

export const gptPipeline = visionPipeline(
  'gpt',
  'GPT-5.4 mini',
  'OpenAI vision extraction via GPT-5.4 mini.',
  OpenAiLogo
);

export const grokPipeline = visionPipeline(
  'grok',
  'Grok 4.5',
  'xAI vision extraction via Grok 4.5.',
  XaiLogo
);
