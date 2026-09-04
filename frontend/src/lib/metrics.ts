/**
 * Compatibility facade over the unified evaluation engine.
 * Prefer importing from `@/lib/evaluation` for new code.
 */
import type { GoldenValue } from './dataset';
import {
  evaluateField,
  resolveFieldConfig,
  scoreBand,
  applyJudgeUplift,
  resolveFieldJudge,
  type FieldEvalConfig,
  type PRF,
  type FieldEvaluation,
  type JudgeFieldResult,
} from './evaluation';

export type { PRF, FieldEvalConfig };
export { scoreBand, resolveFieldConfig };

export interface FieldMetricsRow {
  key: string;
  config: FieldEvalConfig;
  byModel: Record<string, PRF>;
  avg: PRF;
  hasData: boolean;
  /** Full per-model field evaluations when available. */
  evaluationsByModel?: Record<string, FieldEvaluation>;
  avgEvaluation?: FieldEvaluation;
}

/**
 * Build dashboard rows from the same engine the main UI uses.
 * Optional per-model `judgeResults` re-apply semantic uplift without LLM calls.
 */
export function buildDashboardRows(
  goldenKeys: string[],
  goldenExtraction: Record<string, { value: GoldenValue }>,
  modelResults: Array<{
    id: string;
    data: Record<string, GoldenValue>;
    judgeResults?: Record<string, JudgeFieldResult>;
  }>,
  configs: Record<string, Partial<FieldEvalConfig>>
): FieldMetricsRow[] {
  return goldenKeys.map((key) => {
    const config = resolveFieldConfig(key, configs[key]);
    const goldenValue = goldenExtraction[key]?.value;
    const byModel: Record<string, PRF> = {};
    const evaluationsByModel: Record<string, FieldEvaluation> = {};

    for (const { id, data, judgeResults } of modelResults) {
      if (goldenValue === undefined) continue;
      // Same universe as evaluateDataset: missing keys score as not_found.
      const modelValue = data[key] ?? 'not_found';
      const det = evaluateField(modelValue, goldenValue, key, config);
      const judge = resolveFieldJudge(key, judgeResults ?? {});
      const ev = applyJudgeUplift(det, judge);
      evaluationsByModel[id] = ev;
      byModel[id] = {
        precision: ev.precision,
        recall: ev.recall,
        f1: ev.f1,
      };
    }

    const n = Object.keys(byModel).length;
    const avg: PRF =
      n === 0
        ? { precision: 0, recall: 0, f1: 0 }
        : {
            precision:
              Object.values(byModel).reduce((s, p) => s + p.precision, 0) / n,
            recall: Object.values(byModel).reduce((s, p) => s + p.recall, 0) / n,
            f1: Object.values(byModel).reduce((s, p) => s + p.f1, 0) / n,
          };

    return {
      key,
      config,
      byModel,
      avg,
      hasData: n > 0,
      evaluationsByModel,
    };
  });
}

export function aggregateRows(
  rows: FieldMetricsRow[],
  view: string
): PRF & { count: number } {
  const prfs: PRF[] = [];
  for (const row of rows) {
    const prf = view === 'avg' ? (row.hasData ? row.avg : undefined) : row.byModel[view];
    if (!prf) continue;
    prfs.push(prf);
  }
  if (prfs.length === 0) return { precision: 0, recall: 0, f1: 0, count: 0 };
  let p = 0;
  let r = 0;
  let f = 0;
  for (const prf of prfs) {
    p += prf.precision;
    r += prf.recall;
    f += prf.f1;
  }
  const count = prfs.length;
  return { precision: p / count, recall: r / count, f1: f / count, count };
}
