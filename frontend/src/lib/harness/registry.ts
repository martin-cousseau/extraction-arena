import type { PipelineDescriptor, PipelineId } from './types';

export const PIPELINES: Record<PipelineId, PipelineDescriptor> = {
  docai: {
    id: 'docai',
    label: 'DocAI',
    description: 'LlamaExtract agentic parse + extract (native).',
    deprecated: false,
    kind: 'native',
  },
  glm: {
    id: 'glm',
    label: 'GLM-5V-Turbo',
    description: 'Deprecated vision pipeline via Z.AI.',
    deprecated: true,
    kind: 'vision',
  },
  gpt: {
    id: 'gpt',
    label: 'GPT-5.4 mini',
    description: 'Deprecated vision pipeline via OpenAI.',
    deprecated: true,
    kind: 'vision',
  },
  grok: {
    id: 'grok',
    label: 'Grok 4.5',
    description: 'Deprecated vision pipeline via xAI.',
    deprecated: true,
    kind: 'vision',
  },
};

export const DEFAULT_PIPELINE_ID: PipelineId = 'docai';

export const PIPELINE_LIST: PipelineDescriptor[] = [
  PIPELINES.docai,
  PIPELINES.glm,
  PIPELINES.gpt,
  PIPELINES.grok,
];
