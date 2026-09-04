import {
  callVisionModel,
  GLM_PRICING,
  GPT_PRICING,
  GROK_PRICING,
  type VisionConfig,
} from '../../api';
import { buildCanonicalPrompt } from '../../canonical/prompt';
import type { RescueSheetV1 } from '../../canonical/schema';
import type { SourceContext } from '../../canonical/adapters/types';
import type { PipelineId, PipelineRunInput, RunUsage } from '../types';

const VISION_CONFIG: Record<
  Exclude<PipelineId, 'docai'>,
  Omit<VisionConfig, 'apiKey'> & { keyField: 'zaiKey' | 'openaiKey' | 'xaiKey' }
> = {
  glm: {
    modelId: 'glm-5v-turbo',
    label: 'GLM-5V-Turbo',
    endpoint: 'https://api.z.ai/api/paas/v4/chat/completions',
    keyField: 'zaiKey',
    ...GLM_PRICING,
  },
  gpt: {
    modelId: 'gpt-5.4-mini',
    label: 'GPT-5.4 mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyField: 'openaiKey',
    ...GPT_PRICING,
  },
  grok: {
    modelId: 'grok-4.5',
    label: 'Grok 4.5',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    keyField: 'xaiKey',
    ...GROK_PRICING,
  },
};

export interface VisionAdapterKeys {
  zaiKey: string;
  openaiKey: string;
  xaiKey: string;
}

export async function runVisionAdapter(
  pipelineId: Exclude<PipelineId, 'docai'>,
  input: PipelineRunInput,
  keys: VisionAdapterKeys
) {
  const spec = VISION_CONFIG[pipelineId];
  const apiKey = keys[spec.keyField];
  if (!apiKey.trim()) {
    throw new Error(`Missing API key for ${spec.label}.`);
  }
  if (input.pages.length === 0) {
    throw new Error('This dataset has no converted pages.');
  }

  const canonical = input.canonical as RescueSheetV1;
  const prompt = buildCanonicalPrompt(canonical, input.pdfName);
  const ctx: SourceContext = {
    recordId: input.datasetId,
    receivedAt: new Date().toISOString(),
    sourcePages: input.pages.map((p) => ({ page_id: `file:${p.page}`, page_number: p.page })),
    sourceFormat: input.pdfName,
  };

  const extracted = await callVisionModel(
    { ...spec, apiKey },
    input.pages,
    prompt,
    ctx,
    input.signal
  );

  const usage: RunUsage = {
    promptTokens: extracted.promptTokens,
    completionTokens: extracted.completionTokens,
    costUsd: extracted.estimatedCostUsd,
  };

  return {
    ...extracted,
    usage,
  };
}
