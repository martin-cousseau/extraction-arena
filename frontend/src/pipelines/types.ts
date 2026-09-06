import type { ComponentType } from 'react';
import type { Issue } from '@/lib/canonical/validate';
import type { RescueSheetV1Draft } from '@/lib/canonical/schema';
import type { GoldenValue } from '@/lib/dataset';
import type { PipelineId, PipelineRunInput, RunUsage } from '@/lib/harness/types';
import type { LlamaExtractTier } from './llamaparse/tiers';

export type { PipelineId, PipelineRunInput, RunUsage, LlamaExtractTier };

export interface PipelineExtractOptions {
  llamaKey?: string;
  llamaTier?: LlamaExtractTier;
  visionKeys: {
    zaiKey: string;
    openaiKey: string;
    xaiKey: string;
  };
}

export interface PipelineDeleteJobsOptions {
  llamaKey?: string;
}

export interface PipelineExtractOutcome {
  extractResult: unknown;
  extractMetadata?: unknown;
  usage: RunUsage;
  jobId?: string;
  elapsedMs: number;
  rawText: string;
  draft?: RescueSheetV1Draft;
  validationIssues?: Issue[];
  data?: Record<string, GoldenValue>;
}

/**
 * One extraction pipeline. Add a folder under `pipelines/` and append it to
 * the registry — launch UI, schema, and extract all come from this object.
 */
export interface PipelineDefinition {
  id: PipelineId;
  label: string;
  description: string;
  deprecated: boolean;
  kind: 'native' | 'vision';
  requiresPdf: boolean;
  Logo: ComponentType<{ className?: string }>;
  /** JSON Schema posted to the extractor. Omit for prompt-only vision adapters. */
  dataSchema?: () => unknown;
  extract: (
    input: PipelineRunInput,
    options: PipelineExtractOptions
  ) => Promise<PipelineExtractOutcome>;
  /** Drop provider-side extract jobs when a run or dataset is deleted. */
  deleteJobs?: (jobIds: string[], options: PipelineDeleteJobsOptions) => Promise<void>;
}
