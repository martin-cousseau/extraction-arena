import type { GoldenDataset, GoldenValue } from '../dataset';
import { callLlmJson } from '../api';
import type {
  DatasetEvaluation,
  InsightSeverity,
  JudgeFieldResult,
  JudgeInsights,
  JudgeInsightTheme,
} from './types';
import { resolveFieldJudge } from './uplift';
import {
  INSIGHTS_ENDPOINT,
  INSIGHTS_MODEL_ID,
  INSIGHTS_PROMPT_VERSION,
  INSIGHTS_SYSTEM_PROMPT,
  buildInsightsUserPrompt,
  type InsightsCandidate,
} from './insightsPrompt';

const SEVERITIES = new Set<InsightSeverity>(['high', 'medium', 'low']);

function formatValue(v: GoldenValue): string {
  if (Array.isArray(v)) return v.map(String).join(' | ');
  if (typeof v === 'object' && v !== null) {
    return Object.entries(v)
      .map(([k, val]) => `${k}: ${val}`)
      .join(' | ');
  }
  return String(v);
}

export function selectInsightsCandidates(
  evaluation: DatasetEvaluation,
  golden: GoldenDataset,
  modelData: Record<string, GoldenValue>,
  judgeResults: Record<string, JudgeFieldResult> = {}
): InsightsCandidate[] {
  const out: InsightsCandidate[] = [];
  for (const f of evaluation.perField) {
    if (f.match && f.partial >= 1) continue;
    const goldField = golden.golden_extraction[f.key];
    if (!goldField) continue;
    const judge = resolveFieldJudge(f.key, judgeResults);
    out.push({
      fieldKey: f.key,
      label: f.label,
      goldenValue: formatValue(goldField.value),
      modelValue: formatValue(modelData[f.key] ?? 'not_found'),
      precision: f.precision,
      recall: f.recall,
      f1: f.f1,
      verdict: judge?.verdict,
      rationale: judge?.rationale,
    });
  }
  return out;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function parseInsightsResponse(raw: unknown, allowedFields: string[]): JudgeInsights {
  const allowed = new Set(allowedFields);
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const summary =
    typeof obj.summary === 'string' && obj.summary.trim()
      ? obj.summary.trim()
      : 'Judge did not return a summary.';

  const themes: JudgeInsightTheme[] = [];
  const rawThemes = Array.isArray(obj.themes) ? obj.themes : [];
  for (const row of rawThemes) {
    if (!row || typeof row !== 'object') continue;
    const t = row as Record<string, unknown>;
    const title = typeof t.title === 'string' ? t.title.trim() : '';
    if (!title) continue;
    const severity: InsightSeverity = SEVERITIES.has(t.severity as InsightSeverity)
      ? (t.severity as InsightSeverity)
      : 'medium';
    const fields = asStringArray(t.fields).filter((key) => allowed.has(key));
    const detail = typeof t.detail === 'string' ? t.detail.trim() : '';
    themes.push({ title, severity, fields, detail });
    if (themes.length >= 5) break;
  }

  return {
    summary,
    themes,
    strengths: asStringArray(obj.strengths).slice(0, 5),
    model: INSIGHTS_MODEL_ID,
    promptVersion: INSIGHTS_PROMPT_VERSION,
  };
}

export interface InsightsRunOptions {
  apiKey: string;
  signal?: AbortSignal;
}

/**
 * One extra LLM call after field judging. Does not change scores.
 */
export async function runJudgeInsights(
  evaluation: DatasetEvaluation,
  golden: GoldenDataset,
  modelData: Record<string, GoldenValue>,
  judgeResults: Record<string, JudgeFieldResult>,
  options: InsightsRunOptions
): Promise<JudgeInsights> {
  const candidates = selectInsightsCandidates(evaluation, golden, modelData, judgeResults);
  if (candidates.length === 0) {
    return {
      summary: 'Every scored field matched the golden extraction. No mismatch themes to report.',
      themes: [],
      strengths: ['All fields matched exactly or with full partial credit.'],
      model: INSIGHTS_MODEL_ID,
      promptVersion: INSIGHTS_PROMPT_VERSION,
    };
  }

  const raw = await callLlmJson({
    endpoint: INSIGHTS_ENDPOINT,
    apiKey: options.apiKey,
    modelId: INSIGHTS_MODEL_ID,
    system: INSIGHTS_SYSTEM_PROMPT,
    user: buildInsightsUserPrompt(candidates),
    signal: options.signal,
  });

  return parseInsightsResponse(
    raw,
    candidates.map((c) => c.fieldKey)
  );
}
