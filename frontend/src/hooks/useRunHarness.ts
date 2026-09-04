import { useCallback, useRef, useState } from 'react';
import { isAbortError } from '@/lib/api';
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

export function useRunHarness() {
  const [running, setRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const upsertRun = useAppStore((s) => s.upsertRun);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const run = useCallback(
    async (pipelineId?: PipelineId, extractOptions?: { llamaTier?: LlamaExtractTier }) => {
      const state = useAppStore.getState();
      const active = state.active;
      if (!active) throw new Error('No dataset selected.');
      const id = pipelineId ?? state.selectedPipeline;
      getPipeline(id);
      const llamaTier = id === 'docai' ? extractOptions?.llamaTier ?? state.llamaExtractTier : undefined;
      const controller = new AbortController();
      controllerRef.current = controller;
      const draft = createRunningRecord(active.id, id, llamaTier);
      const startId = runStartNotificationId(draft.id);
      const doneId = runDoneNotificationId(draft.id);
      const documentName = active.name;
      registerInFlightRun(draft.id, controller);
      setRunning(true);
      try {
        await upsertRun(draft);
        if (isRunRemoved(draft.id)) return null;
        pushNotification(runProgressNotification(draft.id, documentName, 'extracting'));
        const result = await executePipelineRun({
          pipelineId: id,
          input: {
            datasetId: active.id,
            pdfName: active.pdfName,
            pdfBlob: active.pdfBlob,
            pages: active.pages,
            canonical: active.canonical,
            signal: controller.signal,
          },
          configMap: state.metricConfigs[active.id] ?? {},
          golden: active.golden,
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
            score != null ? `${active.name} · extraction score ${score}` : `${active.name} finished.`,
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
            description: active.name,
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
          description: failed.error ?? `${active.name} did not finish.`,
          status: 'error',
          chip: runStatusChip('failed'),
          runId: draft.id,
          autoDismissDuration: DONE_DISMISS_MS,
        });
        return null;
      } finally {
        unregisterInFlightRun(draft.id);
        setRunning(false);
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [upsertRun]
  );

  return { run, cancel, running };
}
