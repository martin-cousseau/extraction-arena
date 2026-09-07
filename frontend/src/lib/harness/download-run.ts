import type { RunRecord } from './types';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function runTraceFilename(runs: RunRecord[], now = new Date()): string {
  if (runs.length === 1) return `run-${runs[0].id}.json`;
  return `runs-${runs.length}-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.json`;
}

export function serializeRunTraces(runs: RunRecord[]): string {
  const payload = runs.length === 1 ? runs[0] : runs;
  return JSON.stringify(payload, null, 2);
}

/** Trigger a browser download of one run object or an array of runs. */
export function downloadRunTraces(runs: RunRecord[]): void {
  if (runs.length === 0) return;
  const blob = new Blob([serializeRunTraces(runs)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = runTraceFilename(runs);
  a.click();
  URL.revokeObjectURL(url);
}
