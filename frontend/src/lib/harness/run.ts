import { normalizeVlmToDraft } from '../canonical/vlm';
import { project } from '../canonical/project';
import { validate } from '../canonical/validate';
import type { SourceContext } from '../canonical/adapters/types';
import type { GoldenDataset, GoldenValue } from '../dataset';
import { evaluateDataset } from '../evaluation';
import type { FieldEvalConfig } from '../evaluation/types';
import { runDocaiAdapter, type DocaiAdapterOptions } from './adapters/docai';
import { runVisionAdapter, type VisionAdapterKeys } from './adapters/vision';
import type { PipelineId, PipelineRunInput, RunRecord } from './types';

export interface HarnessRunOptions {
  pipelineId: PipelineId;
  input: PipelineRunInput;
  configMap: Record<string, Partial<FieldEvalConfig>>;
  golden: GoldenDataset;
  visionKeys: VisionAdapterKeys;
  docai?: DocaiAdapterOptions;
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
  pipelineId: PipelineId
): RunRecord {
  return {
    id: newId(),
    datasetId,
    pipelineId,
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
  const { pipelineId, input, configMap, golden } = options;
  const startedAt = Date.now();
  const ctx: SourceContext = {
    recordId: input.datasetId,
    receivedAt: new Date().toISOString(),
    sourcePages: input.pages.map((p) => ({ page_id: `file:${p.page}`, page_number: p.page })),
    sourceFormat: input.pdfName,
  };

  if (pipelineId === 'docai') {
    const extracted = await runDocaiAdapter(input, options.docai);
    const draft = normalizeVlmToDraft(extracted.extractResult, ctx);
    const validation = validate(draft);
    const data = flattenProjection(project(draft));
    const evaluation = evaluateDataset(data, golden, configMap);
    return {
      datasetId: input.datasetId,
      pipelineId,
      status: 'completed',
      finishedAt: Date.now(),
      elapsedMs: extracted.elapsedMs,
      usage: extracted.usage,
      jobId: extracted.jobId,
      raw: extracted.extractResult,
      rawText: extracted.rawText,
      draft,
      validationIssues: validation.issues,
      data,
      evaluation,
      fieldMetadata: extracted.extractMetadata,
    };
  }

  const extracted = await runVisionAdapter(pipelineId, input, options.visionKeys);
  const evaluation = evaluateDataset(extracted.data, golden, configMap);
  return {
    datasetId: input.datasetId,
    pipelineId,
    status: 'completed',
    finishedAt: Date.now(),
    elapsedMs: Date.now() - startedAt,
    usage: extracted.usage,
    rawText: extracted.rawText,
    draft: extracted.draft,
    validationIssues: extracted.validationIssues,
    data: extracted.data,
    evaluation,
  };
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
