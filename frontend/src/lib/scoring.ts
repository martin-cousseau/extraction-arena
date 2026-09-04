/**
 * Compatibility facade over the unified evaluation engine.
 * Prefer importing from `@/lib/evaluation` for new code.
 */
import type { GoldenDataset, GoldenValue, ValueKind } from './dataset';
import {
  evaluateDataset as evalDataset,
  isAbsentValue,
  normalizeStr,
  reapplyJudgeResults,
  type DatasetEvaluation,
  type FieldEvaluation,
  type FieldEvalConfig,
  type JudgeFieldResult,
} from './evaluation';

export { isAbsentValue, normalizeStr };

export interface FieldScore {
  key: string;
  label: string;
  match: boolean;
  /** 0..1 partial overlap (item-level for arrays/maps). */
  partial: number;
  difficulty?: string;
  source?: string;
  kind: ValueKind;
  /** Full evaluation when available (same engine as metrics). */
  evaluation?: FieldEvaluation;
}

export interface ScoreResult {
  perField: FieldScore[];
  matched: number;
  total: number;
  /** 0-100 exact-match accuracy across fields (gate). */
  accuracy: number;
  /** 0-100 mean partial credit (softer metric). */
  partialAccuracy: number;
  /** 0-100 composed extraction score (primary UI gauge). */
  extractionScore: number;
  meanPrecision?: number;
  meanRecall?: number;
  meanF1?: number;
  detAccuracy?: number;
  judgeUpliftCount?: number;
  judgeReviewedCount?: number;
  /** Full dataset evaluation (single engine). */
  evaluation?: DatasetEvaluation;
}

function toScoreResult(evaluation: DatasetEvaluation, golden: GoldenDataset): ScoreResult {
  const perField: FieldScore[] = evaluation.perField.map((f) => {
    const meta = golden.golden_extraction[f.key];
    return {
      key: f.key,
      label: f.label,
      match: f.match,
      partial: f.partial,
      difficulty: meta?.difficulty,
      source: meta?.source,
      kind: f.kind,
      evaluation: f,
    };
  });

  return {
    perField,
    matched: evaluation.matched,
    total: evaluation.total,
    accuracy: evaluation.accuracy,
    partialAccuracy: evaluation.partialAccuracy,
    extractionScore: evaluation.extractionScore,
    meanPrecision: evaluation.meanPrecision,
    meanRecall: evaluation.meanRecall,
    meanF1: evaluation.meanF1,
    detAccuracy: evaluation.detAccuracy,
    judgeUpliftCount: evaluation.judgeUpliftCount,
    judgeReviewedCount: evaluation.judgeReviewedCount,
    evaluation,
  };
}

/**
 * Score one model extraction against golden.
 * Uses smart defaults (and optional per-field config overrides).
 * When `judgeResults` is provided, deterministic scores are uplifted without re-calling the LLM.
 */
export function scoreDataset(
  extracted: Record<string, GoldenValue>,
  golden: GoldenDataset,
  configMap: Record<string, Partial<FieldEvalConfig>> = {},
  judgeResults?: Record<string, JudgeFieldResult>
): ScoreResult {
  const det = evalDataset(extracted, golden, configMap);
  const evaluation =
    judgeResults && Object.keys(judgeResults).length > 0
      ? reapplyJudgeResults(det, judgeResults)
      : det;
  return toScoreResult(evaluation, golden);
}
