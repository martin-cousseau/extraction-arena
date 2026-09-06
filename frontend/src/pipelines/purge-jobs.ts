import { PIPELINES } from './registry';
import type { PipelineDeleteJobsOptions, PipelineId } from './types';

export function collectRemoteJobIds(
  runs: Array<{ pipelineId: PipelineId; jobId?: string }>
): Partial<Record<PipelineId, string[]>> {
  const grouped: Partial<Record<PipelineId, string[]>> = {};
  for (const run of runs) {
    const jobId = run.jobId?.trim();
    if (!jobId) continue;
    const list = grouped[run.pipelineId] ?? [];
    if (!list.includes(jobId)) list.push(jobId);
    grouped[run.pipelineId] = list;
  }
  return grouped;
}

/** Best-effort: only pipelines that expose `deleteJobs` are contacted. */
export async function purgePipelineJobsForRuns(
  runs: Array<{ pipelineId: PipelineId; jobId?: string }>,
  options: PipelineDeleteJobsOptions = {}
): Promise<void> {
  const grouped = collectRemoteJobIds(runs);
  const tasks: Promise<void>[] = [];
  for (const [pipelineId, jobIds] of Object.entries(grouped) as Array<[PipelineId, string[]]>) {
    if (!jobIds.length) continue;
    const deleteJobs = PIPELINES[pipelineId]?.deleteJobs;
    if (!deleteJobs) continue;
    tasks.push(deleteJobs(jobIds, options));
  }
  if (tasks.length === 0) return;
  await Promise.all(tasks);
}
