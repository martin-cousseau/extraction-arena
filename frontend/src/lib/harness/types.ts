import type { Issue } from '../canonical/validate';
import type { RescueSheetV1Draft } from '../canonical/schema';
import type { GoldenValue } from '../dataset';
import type { DatasetEvaluation, JudgeFieldResult, JudgeInsights } from '../evaluation/types';
import type { LlamaExtractTier } from '../../pipelines/llamaparse/tiers';

export type PipelineId = 'docai' | 'glm' | 'gpt' | 'grok';

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PipelineDescriptor {
  id: PipelineId;
  label: string;
  description: string;
  deprecated: boolean;
  /** Native backend pipeline vs CORS-proxied vision call. */
  kind: 'native' | 'vision';
}

export interface RunUsage {
  credits?: number | null;
  extractCredits?: number | null;
  parseCredits?: number | null;
  promptTokens?: number;
  completionTokens?: number;
  documentTokens?: number | null;
  outputTokens?: number | null;
  costUsd: number;
}

export interface RunRecord {
  id: string;
  datasetId: string;
  pipelineId: PipelineId;
  /** LlamaExtract `tier` used for this run. Only set on LlamaParse (`docai`) runs. */
  extractTier?: LlamaExtractTier;
  status: RunStatus;
  startedAt: number;
  finishedAt: number | null;
  elapsedMs: number;
  usage: RunUsage;
  jobId?: string;
  raw?: unknown;
  rawText?: string;
  draft?: RescueSheetV1Draft;
  validationIssues?: Issue[];
  data: Record<string, GoldenValue>;
  evaluation?: DatasetEvaluation;
  fieldMetadata?: unknown;
  judgeResults?: Record<string, JudgeFieldResult>;
  /** Qualitative brief. Overlay only — never rewrites `evaluation`. */
  judgeInsights?: JudgeInsights;
  error?: string;
}

export interface PipelineRunInput {
  datasetId: string;
  pdfName: string;
  pdfBlob?: Blob | null;
  pages: Array<{ page: number; width: number; height: number; dataUrl: string }>;
  canonical: unknown;
  signal?: AbortSignal;
}
