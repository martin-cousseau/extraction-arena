/**
 * Run-level insight brief. Prompt version is stored on the result — bump
 * when the rubric changes. Uses the same model as the field judge.
 */

import { JUDGE_MODEL_ID } from './judgePrompt';

export const INSIGHTS_PROMPT_VERSION = 'insights-v1' as const;
export const INSIGHTS_MODEL_ID = JUDGE_MODEL_ID;
export { JUDGE_ENDPOINT as INSIGHTS_ENDPOINT } from './judgePrompt';

export interface InsightsCandidate {
  fieldKey: string;
  label: string;
  goldenValue: string;
  modelValue: string;
  precision: number;
  recall: number;
  f1: number;
  verdict?: string;
  rationale?: string;
}

export const INSIGHTS_SYSTEM_PROMPT = `You are briefing a non-engineer stakeholder on an EV first-responder rescue-sheet extraction run.

You receive mismatched fields only: golden (expected) vs model (returned), plus optional judge verdicts. Official numeric scores are already computed elsewhere — do not invent or replace them.

## Job
Write a short operational brief: what the pipeline got systematically wrong, and what it got right.

## Rules
1. Only discuss fields in the input. Never invent paths.
2. Group related misses into themes (e.g. procedure order, voltage labels, invented prohibitions, missing warnings).
3. Be specific and factual. Quote distinctive wording when it helps.
4. Safety-critical errors (voltage, do/do-not, step order, missing hazards) are severity "high".
5. Output JSON only. No markdown fences.

## Output schema
{
  "summary": "<one short paragraph>",
  "themes": [
    { "title": "<short name>", "severity": "high|medium|low", "fields": ["<fieldKey>", "..."], "detail": "<one or two sentences>" }
  ],
  "strengths": ["<short bullet>", "..."]
}

Return 1–5 themes. Strengths may be an empty array if nothing notable succeeded among the given mismatches (do not praise fields that are not in the input).`;

export function buildInsightsUserPrompt(candidates: InsightsCandidate[]): string {
  const payload = candidates.map((c) => ({
    field: c.fieldKey,
    label: c.label,
    gold: c.goldenValue,
    returned: c.modelValue,
    precision: Number(c.precision.toFixed(3)),
    recall: Number(c.recall.toFixed(3)),
    f1: Number(c.f1.toFixed(3)),
    verdict: c.verdict ?? null,
    rationale: c.rationale ?? null,
  }));

  return `Write the stakeholder brief for these mismatched extraction fields.

Items:
${JSON.stringify(payload, null, 2)}`;
}
