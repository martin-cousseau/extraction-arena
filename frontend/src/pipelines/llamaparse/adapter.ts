import { creditsToUsd } from '@/lib/harness/cost';
import type { PipelineRunInput } from '@/lib/harness/types';
import type { PipelineExtractOptions, PipelineExtractOutcome } from '../types';
import { llamaExtractDataSchema } from './schema';
import { DEFAULT_LLAMA_EXTRACT_TIER, resolveLlamaExtractTier, type LlamaExtractTier } from './tiers';

export function llamaExtractClientConfig(tier?: LlamaExtractTier) {
  return {
    tier: resolveLlamaExtractTier(tier ?? DEFAULT_LLAMA_EXTRACT_TIER),
    extraction_target: 'per_doc' as const,
    parse_tier: 'agentic' as const,
    cite_sources: true,
    confidence_scores: true,
  };
}

/**
 * LlamaParse (LlamaExtract) extract. Always posts this pipeline's schema —
 * callers cannot swap in another JSON Schema by accident.
 */
export async function runLlamaparseExtract(
  input: PipelineRunInput,
  options: PipelineExtractOptions,
  dataSchema: unknown = llamaExtractDataSchema()
): Promise<PipelineExtractOutcome> {
  if (!input.pdfBlob) {
    throw new Error('LlamaParse needs the original PDF. Re-upload the source file on the dataset page.');
  }

  const startedAt = performance.now();
  const fd = new FormData();
  fd.append('pdf', input.pdfBlob, input.pdfName || 'document.pdf');
  fd.append('data_schema', JSON.stringify(dataSchema));
  fd.append(
    'configuration',
    JSON.stringify(llamaExtractClientConfig(options.llamaTier))
  );

  const headers: HeadersInit = {};
  if (options.llamaKey?.trim()) {
    headers['x-llama-api-key'] = options.llamaKey.trim();
  }

  const res = await fetch('/api/pipelines/docai', {
    method: 'POST',
    body: fd,
    headers,
    signal: input.signal,
  });

  const body = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) {
    throw new Error(body.error ?? `LlamaParse failed (HTTP ${res.status})`);
  }

  const credits = asNumber(body.usage?.credits);
  const extractCredits = asNumber(body.usage?.extract_credits ?? body.usage?.extractCredits);
  const parseCredits = asNumber(body.usage?.parse_credits ?? body.usage?.parseCredits);

  return {
    extractResult: body.extractResult ?? body.extract_result ?? null,
    extractMetadata: body.extractMetadata ?? body.extract_metadata ?? null,
    jobId: String(body.jobId ?? body.id ?? ''),
    elapsedMs: performance.now() - startedAt,
    rawText: JSON.stringify(body.extractResult ?? body.extract_result ?? {}, null, 2),
    usage: {
      credits,
      extractCredits,
      parseCredits,
      documentTokens: asNumber(body.usage?.num_document_tokens ?? body.usage?.documentTokens),
      outputTokens: asNumber(body.usage?.num_output_tokens ?? body.usage?.outputTokens),
      costUsd: creditsToUsd(credits),
    },
  };
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function uniqueJobIds(jobIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of jobIds) {
    const jobId = raw.trim();
    if (!jobId || seen.has(jobId)) continue;
    seen.add(jobId);
    out.push(jobId);
  }
  return out;
}

/**
 * Delete LlamaExtract jobs on Llama Cloud via the backend proxy.
 * Local run/dataset delete still proceeds if this fails.
 */
export async function deleteLlamaparseJobs(
  jobIds: string[],
  options: { llamaKey?: string } = {}
): Promise<void> {
  const ids = uniqueJobIds(jobIds);
  if (ids.length === 0) return;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (options.llamaKey?.trim()) {
    headers['x-llama-api-key'] = options.llamaKey.trim();
  }

  const res = await fetch('/api/pipelines/docai/jobs/delete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobIds: ids }),
  });
  const body = (await res.json().catch(() => ({ error: res.statusText }))) as {
    error?: string;
    results?: Array<{ jobId?: string; deleted?: boolean; error?: string }>;
  };
  if (!res.ok) {
    throw new Error(body.error ?? `LlamaParse job delete failed (HTTP ${res.status})`);
  }

  const failed = (body.results ?? []).filter((row) => row && row.deleted === false);
  if (failed.length > 0) {
    throw new Error(
      `LlamaParse job delete failed for ${failed.map((row) => row.jobId ?? '?').join(', ')}`
    );
  }
}
