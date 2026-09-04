import { llamaExtractDataSchema } from '../../canonical/extractSchema';
import { creditsToUsd } from '../cost';
import type { PipelineRunInput, RunUsage } from '../types';

export interface DocaiAdapterResult {
  extractResult: unknown;
  extractMetadata: unknown;
  usage: RunUsage;
  jobId: string;
  elapsedMs: number;
  rawText: string;
}

export interface DocaiAdapterOptions {
  apiKeyOverride?: string;
}

export async function runDocaiAdapter(
  input: PipelineRunInput,
  options: DocaiAdapterOptions = {}
): Promise<DocaiAdapterResult> {
  if (!input.pdfBlob) {
    throw new Error('DocAI needs the original PDF. Re-upload the source file on the dataset page.');
  }

  const startedAt = performance.now();
  const fd = new FormData();
  fd.append('pdf', input.pdfBlob, input.pdfName || 'document.pdf');
  fd.append('data_schema', JSON.stringify(llamaExtractDataSchema()));
  fd.append(
    'configuration',
    JSON.stringify({
      tier: 'agentic',
      extraction_target: 'per_doc',
      parse_tier: 'agentic',
      cite_sources: true,
      confidence_scores: true,
    })
  );

  const headers: HeadersInit = {};
  if (options.apiKeyOverride?.trim()) {
    headers['x-llama-api-key'] = options.apiKeyOverride.trim();
  }

  const res = await fetch('/api/pipelines/docai', {
    method: 'POST',
    body: fd,
    headers,
    signal: input.signal,
  });

  const body = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) {
    throw new Error(body.error ?? `DocAI failed (HTTP ${res.status})`);
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
