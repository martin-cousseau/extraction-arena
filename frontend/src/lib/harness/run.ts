import { normalizeVlmToDraft } from '../canonical/vlm';
import { project } from '../canonical/project';
import { validate } from '../canonical/validate';
import type { SourceContext } from '../canonical/adapters/types';
import type { GoldenDataset, GoldenValue } from '../dataset';
import { evaluateDataset } from '../evaluation';
import type { FieldEvalConfig } from '../evaluation/types';
import { getPipeline } from '../../pipelines/registry';
import type { LlamaExtractTier } from '../../pipelines/llamaparse/tiers';
import type { PipelineId, PipelineRunInput, RunRecord, RunStatus } from './types';

/** Live pipeline stages. Every adapter extracts, then the harness scores. */
export type RunProgressPhase = 'extracting' | 'evaluating';

export interface HarnessRunOptions {
  pipelineId: PipelineId;
  input: PipelineRunInput;
  configMap: Record<string, Partial<FieldEvalConfig>>;
  golden: GoldenDataset;
  visionKeys: {
    zaiKey: string;
    openaiKey: string;
    xaiKey: string;
  };
  docai?: { apiKeyOverride?: string; tier?: LlamaExtractTier };
  onPhase?: (phase: RunProgressPhase) => void | Promise<void>;
}

function flattenProjection(proj: ReturnType<typeof project>): Record<string, GoldenValue> {
  const out: Record<string, GoldenValue> = {};
  for (const [path, field] of Object.entries(proj)) {
    out[path] = field.value;
  }
  return out;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `run-${Date.now()}`;
}

export function createRunningRecord(
  datasetId: string,
  pipelineId: PipelineId,
  extractTier?: LlamaExtractTier
): RunRecord {
  return {
    id: newId(),
    datasetId,
    pipelineId,
    extractTier: pipelineId === 'docai' ? extractTier : undefined,
    status: 'running',
    startedAt: Date.now(),
    finishedAt: null,
    elapsedMs: 0,
    usage: { costUsd: 0 },
    data: {},
  };
}

/** Normalize → validate → project → score. Never throws on validation issues. */
export async function executePipelineRun(options: HarnessRunOptions): Promise<Omit<RunRecord, 'id' | 'startedAt'>> {
  const { pipelineId, input, configMap, golden, onPhase } = options;
  const startedAt = Date.now();
  const ctx: SourceContext = {
    recordId: input.datasetId,
    receivedAt: new Date().toISOString(),
    sourcePages: input.pages.map((p) => ({ page_id: `file:${p.page}`, page_number: p.page })),
    sourceFormat: input.pdfName,
  };

  await onPhase?.('extracting');

  const pipeline = getPipeline(pipelineId);
  if (pipeline.requiresPdf && !input.pdfBlob) {
    throw new Error(
      `${pipeline.label} needs the original PDF. Re-upload the source file on the dataset page.`
    );
  }

  const extracted = await pipeline.extract(input, {
    llamaKey: options.docai?.apiKeyOverride,
    llamaTier: options.docai?.tier,
    visionKeys: options.visionKeys,
  });

  await onPhase?.('evaluating');
  const draft = extracted.draft ?? normalizeVlmToDraft(extracted.extractResult, ctx);
  const validationIssues = extracted.validationIssues ?? validate(draft).issues;
  const data = extracted.data ?? flattenProjection(project(draft));
  const evaluation = evaluateDataset(data, golden, configMap);

  return {
    datasetId: input.datasetId,
    pipelineId: pipeline.id,
    extractTier: pipelineId === 'docai' ? options.docai?.tier : undefined,
    status: 'completed',
    finishedAt: Date.now(),
    elapsedMs: extracted.elapsedMs || Date.now() - startedAt,
    usage: extracted.usage,
    jobId: extracted.jobId,
    raw: extracted.extractResult,
    rawText: extracted.rawText,
    draft,
    validationIssues,
    data,
    evaluation,
    fieldMetadata: extracted.extractMetadata,
  };
}

/** Dashboard run volume: completed evals only. Failed, cancelled, and in-flight runs do not count. */
export function isCompletedEvalRun(run: Pick<RunRecord, 'status' | 'evaluation'>): boolean {
  return run.status === 'completed' && run.evaluation != null;
}

export function failRun(record: RunRecord, error: unknown, status: 'failed' | 'cancelled' = 'failed'): RunRecord {
  const message = error instanceof Error ? error.message : String(error);
  return {
    ...record,
    status,
    finishedAt: Date.now(),
    elapsedMs: Date.now() - record.startedAt,
    error: message,
  };
}

export function isTickingRun(status: RunStatus): boolean {
  return status === 'running' || status === 'queued';
}

/** Wall-clock elapsed for a live run; stored `elapsedMs` once the run has finished. */
export function liveElapsedMs(
  run: Pick<RunRecord, 'status' | 'startedAt' | 'elapsedMs'>,
  now = Date.now()
): number {
  if (isTickingRun(run.status)) {
    return Math.max(0, now - run.startedAt);
  }
  return run.elapsedMs;
}
