import LlamaCloud, { APIError, NotFoundError } from '@llamaindex/llama-cloud';

export const LLAMA_CREDIT_USD_PER_1000 = 1.25;

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const POLL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000;
const USAGE_RETRY = 5;

export const LLAMA_EXTRACT_TIERS = ['cost_effective', 'agentic', 'agentic_plus', 'turbo'] as const;
export type LlamaExtractTier = (typeof LLAMA_EXTRACT_TIERS)[number];
const EXTRACT_TIER_SET = new Set<string>(LLAMA_EXTRACT_TIERS);

export function resolveLlamaExtractTier(value: unknown): LlamaExtractTier {
  return typeof value === 'string' && EXTRACT_TIER_SET.has(value) ? (value as LlamaExtractTier) : 'agentic';
}

export type LlamaExtractTarget = 'per_doc' | 'per_page' | 'per_table_row';
export type LlamaParseTier = 'agentic' | 'agentic_plus' | 'cost_effective' | 'fast';

export interface LlamaExtractConfig {
  data_schema: unknown;
  tier?: LlamaExtractTier;
  extraction_target?: LlamaExtractTarget;
  parse_tier?: LlamaParseTier;
  cite_sources?: boolean;
  confidence_scores?: boolean;
}

export interface LlamaExtractUsage {
  credits: number | null;
  extract_credits: number | null;
  parse_credits: number | null;
  num_document_tokens: number | null;
  num_output_tokens: number | null;
}

export interface LlamaExtractOutcome {
  jobId: string;
  status: string;
  extractResult: unknown;
  extractMetadata: unknown;
  configuration: unknown;
  usage: LlamaExtractUsage;
  elapsedMs: number;
  errorMessage?: string;
}

export function creditsToUsd(credits: number | null): number {
  if (credits == null || !Number.isFinite(credits) || credits <= 0) return 0;
  return (credits / 1000) * LLAMA_CREDIT_USD_PER_1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readUsage(job: Record<string, unknown>): LlamaExtractUsage {
  const usage = (job.usage ?? (job.metadata as { usage?: unknown } | undefined)?.usage) as
    | Record<string, unknown>
    | undefined;
  return {
    credits: asNumber(usage?.credits),
    extract_credits: asNumber(usage?.extract_credits ?? usage?.extractCredits),
    parse_credits: asNumber(usage?.parse_credits ?? usage?.parseCredits),
    num_document_tokens: asNumber(usage?.num_document_tokens ?? usage?.numDocumentTokens),
    num_output_tokens: asNumber(usage?.num_output_tokens ?? usage?.numOutputTokens),
  };
}

function clientFor(apiKey: string): LlamaCloud {
  return new LlamaCloud({ apiKey });
}

function projectParams(projectId?: string): { project_id: string } | Record<string, never> {
  return projectId ? { project_id: projectId } : {};
}

function isMissingExtractJob(err: unknown): boolean {
  return err instanceof NotFoundError || (err instanceof APIError && err.status === 404);
}

function abortError(): Error {
  return Object.assign(new Error('Extract job cancelled.'), { name: 'AbortError' });
}

export function normalizeExtractJobIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const jobId = item.trim();
    if (!jobId || jobId.length > 200 || /[/\\]/.test(jobId)) continue;
    if (seen.has(jobId)) continue;
    seen.add(jobId);
    out.push(jobId);
  }
  return out;
}

/** Delete a LlamaExtract job (and its results). 404 is success. Running jobs are cancelled first. */
export async function deleteLlamaExtractJob(options: {
  apiKey: string;
  jobId: string;
  projectId?: string;
}): Promise<void> {
  const client = clientFor(options.apiKey);
  const params = projectParams(options.projectId);
  try {
    await client.extract.delete(options.jobId, params);
    return;
  } catch (err) {
    if (isMissingExtractJob(err)) return;
  }
  try {
    await client.extract.cancel(options.jobId, params);
  } catch {
    /* already terminal or gone */
  }
  try {
    await client.extract.delete(options.jobId, params);
  } catch (err) {
    if (isMissingExtractJob(err)) return;
    throw err;
  }
}

export async function deleteLlamaExtractJobs(options: {
  apiKey: string;
  jobIds: string[];
  projectId?: string;
}): Promise<Array<{ jobId: string; deleted: boolean; error?: string }>> {
  return Promise.all(
    options.jobIds.map(async (jobId) => {
      try {
        await deleteLlamaExtractJob({
          apiKey: options.apiKey,
          jobId,
          projectId: options.projectId,
        });
        return { jobId, deleted: true };
      } catch (err) {
        return {
          jobId,
          deleted: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );
}

export async function runLlamaExtract(options: {
  apiKey: string;
  projectId?: string;
  filename: string;
  pdf: Buffer;
  configuration: LlamaExtractConfig;
  signal?: AbortSignal;
}): Promise<LlamaExtractOutcome> {
  const startedAt = Date.now();
  const client = clientFor(options.apiKey);
  const bytes = new Uint8Array(options.pdf);
  const file = new File([bytes], options.filename, { type: 'application/pdf' });
  let jobId: string | undefined;

  try {
    const fileObj = await client.files.create({
      file,
      purpose: 'extract',
    });
    if (options.signal?.aborted) throw abortError();

    let job = await client.extract.create({
      file_input: fileObj.id,
      ...(options.projectId ? { project_id: options.projectId } : {}),
      configuration: {
        data_schema: (options.configuration.data_schema ?? {}) as {
          [key: string]: string | number | boolean | unknown[] | { [key: string]: unknown } | null;
        },
        tier: resolveLlamaExtractTier(options.configuration.tier),
        extraction_target: options.configuration.extraction_target ?? 'per_doc',
        parse_tier: options.configuration.parse_tier ?? 'agentic',
        cite_sources: options.configuration.cite_sources ?? true,
        confidence_scores: options.configuration.confidence_scores ?? true,
      },
    });
    jobId = job.id;
    if (options.signal?.aborted) throw abortError();

    const deadline = Date.now() + MAX_WAIT_MS;
    while (!TERMINAL.has(String(job.status))) {
      if (options.signal?.aborted) throw abortError();
      if (Date.now() > deadline) {
        throw new Error(`Extract job ${job.id} timed out after ${MAX_WAIT_MS / 1000}s (status ${job.status}).`);
      }
      await sleep(POLL_MS);
      job = await client.extract.get(job.id);
    }

    if (job.status !== 'COMPLETED') {
      const message =
        (job as { error_message?: string }).error_message ?? `Extract job ended in ${job.status}`;
      return {
        jobId: job.id,
        status: String(job.status),
        extractResult: null,
        extractMetadata: null,
        configuration: job.configuration ?? null,
        usage: readUsage(job as unknown as Record<string, unknown>),
        elapsedMs: Date.now() - startedAt,
        errorMessage: message,
      };
    }

    let hydrated = job as unknown as Record<string, unknown>;
    for (let i = 0; i < USAGE_RETRY; i += 1) {
      if (options.signal?.aborted) throw abortError();
      try {
        const expanded = await client.extract.get(job.id, {
          expand: ['usage', 'extract_metadata', 'configuration'],
        });
        hydrated = expanded as unknown as Record<string, unknown>;
      } catch {
        hydrated = job as unknown as Record<string, unknown>;
      }
      const usage = readUsage(hydrated);
      if (usage.credits != null || i === USAGE_RETRY - 1) {
        return {
          jobId: String(hydrated.id ?? job.id),
          status: 'COMPLETED',
          extractResult: hydrated.extract_result ?? hydrated.extractResult ?? null,
          extractMetadata: hydrated.extract_metadata ?? hydrated.extractMetadata ?? null,
          configuration: hydrated.configuration ?? null,
          usage,
          elapsedMs: Date.now() - startedAt,
        };
      }
      await sleep(POLL_MS);
    }

    return {
      jobId: job.id,
      status: 'COMPLETED',
      extractResult: job.extract_result ?? null,
      extractMetadata: null,
      configuration: job.configuration ?? null,
      usage: readUsage(job as unknown as Record<string, unknown>),
      elapsedMs: Date.now() - startedAt,
    };
  } catch (err) {
    if (jobId && err instanceof Error && err.name === 'AbortError') {
      await deleteLlamaExtractJob({
        apiKey: options.apiKey,
        jobId,
        projectId: options.projectId,
      }).catch(() => undefined);
    }
    throw err;
  }
}
