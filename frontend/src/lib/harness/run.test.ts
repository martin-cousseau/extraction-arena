import { describe, expect, it } from 'vitest';
import type { DatasetEvaluation } from '../evaluation/types';
import { isCompletedEvalRun } from './run';
import type { RunRecord } from './types';

const evaluation = { matched: 1, total: 1, extractionScore: 1 } as DatasetEvaluation;

function run(status: RunRecord['status'], withEval = false): Pick<RunRecord, 'status' | 'evaluation'> {
  return withEval ? { status, evaluation } : { status };
}

describe('isCompletedEvalRun', () => {
  it('counts only completed runs that have an evaluation', () => {
    expect(isCompletedEvalRun(run('completed', true))).toBe(true);
  });

  it('does not count failed, cancelled, or in-flight runs', () => {
    expect(isCompletedEvalRun(run('failed'))).toBe(false);
    expect(isCompletedEvalRun(run('failed', true))).toBe(false);
    expect(isCompletedEvalRun(run('cancelled'))).toBe(false);
    expect(isCompletedEvalRun(run('running'))).toBe(false);
    expect(isCompletedEvalRun(run('queued'))).toBe(false);
    expect(isCompletedEvalRun(run('completed'))).toBe(false);
  });
});
