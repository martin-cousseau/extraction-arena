import { describe, expect, it } from 'vitest';
import type { DatasetEvaluation } from '../evaluation/types';
import { isCompletedEvalRun, liveElapsedMs } from './run';
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

describe('liveElapsedMs', () => {
  it('returns stored elapsedMs for finished runs', () => {
    expect(liveElapsedMs({ status: 'completed', startedAt: 0, elapsedMs: 1234 }, 9999)).toBe(1234);
    expect(liveElapsedMs({ status: 'failed', startedAt: 0, elapsedMs: 50 }, 9999)).toBe(50);
  });

  it('computes elapsed from startedAt while the run is live', () => {
    expect(liveElapsedMs({ status: 'running', startedAt: 1000, elapsedMs: 0 }, 2500)).toBe(1500);
    expect(liveElapsedMs({ status: 'queued', startedAt: 1000, elapsedMs: 0 }, 1100)).toBe(100);
  });
});

