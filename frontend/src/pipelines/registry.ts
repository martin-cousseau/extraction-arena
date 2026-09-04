import { llamaparsePipeline } from './llamaparse';
import type { PipelineDefinition, PipelineId } from './types';
import { glmPipeline, gptPipeline, grokPipeline } from './vision';

export const DEFAULT_PIPELINE_ID: PipelineId = 'docai';

const MODULES: PipelineDefinition[] = [
  llamaparsePipeline,
  glmPipeline,
  gptPipeline,
  grokPipeline,
];

export const PIPELINE_LIST: PipelineDefinition[] = MODULES;

export const PIPELINES: Record<PipelineId, PipelineDefinition> = {
  docai: llamaparsePipeline,
  glm: glmPipeline,
  gpt: gptPipeline,
  grok: grokPipeline,
};

/** Pipelines offered in the launch-run modal. */
export const LAUNCHABLE_PIPELINES: PipelineDefinition[] = MODULES.filter((p) => !p.deprecated);

export function getPipeline(id: PipelineId): PipelineDefinition {
  const pipeline = PIPELINES[id];
  if (!pipeline) {
    throw new Error(`Unknown pipeline: ${String(id)}`);
  }
  return pipeline;
}

export function isLaunchablePipeline(id: PipelineId): boolean {
  return LAUNCHABLE_PIPELINES.some((p) => p.id === id);
}

export function resolveLaunchable(id: PipelineId): PipelineId {
  return isLaunchablePipeline(id) ? id : DEFAULT_PIPELINE_ID;
}
