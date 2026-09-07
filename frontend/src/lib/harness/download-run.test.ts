import { describe, expect, it } from 'vitest';
import { runTraceFilename, serializeRunTraces } from './download-run';
import type { RunRecord } from './types';

function stubRun(id: string): RunRecord {
  return {
    id,
    datasetId: 'ds-1',
    pipelineId: 'docai',
    status: 'completed',
    startedAt: 1,
    finishedAt: 2,
    elapsedMs: 1,
    usage: { costUsd: 0 },
    data: {},
  };
}

describe('run traces', () => {
  it('names a single run file after its id', () => {
    expect(runTraceFilename([stubRun('abc')])).toBe('run-abc.json');
  });

  it('names a bulk file with the count and date', () => {
    expect(runTraceFilename([stubRun('a'), stubRun('b')], new Date(2026, 8, 7))).toBe(
      'runs-2-2026-09-07.json'
    );
  });

  it('serializes one run as an object and many as an array', () => {
    const a = stubRun('a');
    const b = stubRun('b');
    expect(JSON.parse(serializeRunTraces([a]))).toEqual(a);
    expect(JSON.parse(serializeRunTraces([a, b]))).toEqual([a, b]);
  });
});
