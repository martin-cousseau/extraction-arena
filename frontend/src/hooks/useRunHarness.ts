import { useCallback } from 'react';
import { isAbortError } from '@/lib/api';
import { loadDataset } from '@/lib/db';
import {
  createRunningRecord,
  executePipelineRun,
  failRun,
  isRunRemoved,
  registerInFlightRun,
  unregisterInFlightRun,
  getPipeline,
  type PipelineId,
} from '@/lib/harness';
import type { LlamaExtractTier } from '@/pipelines/llamaparse/tiers';
import {
  dismissNotification,
  pushNotification,
  runDoneNotificationId,
  runProgressNotification,
  runStartNotificationId,
  runStatusChip,
} from '@/lib/notifications';
import { useAppStore } from '@/store';

const DONE_DISMISS_MS = 8000;

export interface LaunchRunOptions {
  llamaTier?: LlamaExtractTier;
  datasetId?: string;
}

export function useRunHarness() {
  const upsertRun = useAppStore((s) => s.upsertRun);

  const run = useCallback(
    async (pipelineId?: PipelineId, extractOptions?: LaunchRunOptions) => {
      const state = useAppStore.getState();
      const datasetId =
        extractOptions?.datasetId ?? state.lastLaunchDatasetId ?? state.active?.id ?? null;
      if (!datasetId) throw new Error('No dataset selected.');
      const record = await loadDataset(datasetId);
      if (!record) throw new Error('Dataset not found.');

      const id = pipelineId ?? state.selectedPipeline;
      getPipeline(id);
      const llamaTier = id === 'docai' ? extractOptions?.llamaTier ?? state.llamaExtractTier : undefined;
      const controller = new AbortController();
      const draft = createRunningRecord(record.id, id, llamaTier);
      const startId = runStartNotificationId(draft.id);
      const doneId = runDoneNotificationId(draft.id);
      const documentName = record.name;
      registerInFlightRun(draft.id, controller);
      try {
        await upsertRun(draft);
        if (isRunRemoved(draft.id)) return null;
        pushNotification(runProgressNotification(draft.id, documentName, 'extracting'));
        const result = await executePipelineRun({
          pipelineId: id,
          input: {
            datasetId: record.id,
            pdfName: record.pdfName,
            pdfBlob: record.pdfBlob,
            pages: record.pages,
            canonical: record.canonical,
            signal: controller.signal,
          },
          configMap: state.metricConfigs[record.id] ?? record.fieldEvalConfigs ?? {},
          golden: record.golden,
          visionKeys: {
            zaiKey: state.zaiKey,
            openaiKey: state.openaiKey,
            xaiKey: state.xaiKey,
          },
          docai: { apiKeyOverride: state.llamaKey, tier: llamaTier },
          onPhase: (phase) => {
            if (controller.signal.aborted || isRunRemoved(draft.id)) return;
            pushNotification(runProgressNotification(draft.id, documentName, phase));
          },
        });
        if (isRunRemoved(draft.id)) return null;
        const completed = {
          ...draft,
          ...result,
          id: draft.id,
          startedAt: draft.startedAt,
        };
        await upsertRun(completed);
        if (isRunRemoved(draft.id)) return null;
        dismissNotification(startId);
        const score = completed.evaluation?.extractionScore;
        pushNotification({
          id: doneId,
          title: 'Run completed',
          description:
            score != null ? `${record.name} · extraction score ${score}` : `${record.name} finished.`,
          status: 'success',
          chip: runStatusChip('completed'),
          runId: draft.id,
          autoDismissDuration: DONE_DISMISS_MS,
        });
        return completed;
      } catch (error) {
        if (isRunRemoved(draft.id)) return null;
        const cancelled = isAbortError(error) || controller.signal.aborted;
        const failed = failRun(draft, error, cancelled ? 'cancelled' : 'failed');
        await upsertRun(failed);
        if (isRunRemoved(draft.id)) return null;
        dismissNotification(startId);
        if (cancelled) {
          pushNotification({
            id: doneId,
            title: 'Run cancelled',
            description: record.name,
            status: 'neutral',
            chip: runStatusChip('cancelled'),
            runId: draft.id,
            autoDismissDuration: DONE_DISMISS_MS,
          });
          return null;
        }
        pushNotification({
          id: doneId,
          title: 'Run failed',
          description: failed.error ?? `${record.name} did not finish.`,
          status: 'error',
          chip: runStatusChip('failed'),
          runId: draft.id,
          autoDismissDuration: DONE_DISMISS_MS,
        });
        return null;
      } finally {
        unregisterInFlightRun(draft.id);
      }
    },
    [upsertRun]
  );

  return { run };
}
