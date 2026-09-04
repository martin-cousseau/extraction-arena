import { useCallback, useRef, useState } from 'react';
import { isAbortError } from '@/lib/api';
import {
  createRunningRecord,
  executePipelineRun,
  failRun,
  type PipelineId,
} from '@/lib/harness';
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
    async (pipelineId?: PipelineId) => {
      const state = useAppStore.getState();
      const active = state.active;
      if (!active) throw new Error('No dataset selected.');
      const id = pipelineId ?? state.selectedPipeline;
      const controller = new AbortController();
      controllerRef.current = controller;
      const draft = createRunningRecord(active.id, id);
      const startId = runStartNotificationId(draft.id);
      const doneId = runDoneNotificationId(draft.id);
      const documentName = active.name;
      setRunning(true);
      await upsertRun(draft);
      pushNotification(runProgressNotification(draft.id, documentName, 'extracting'));
      try {
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
          docai: { apiKeyOverride: state.llamaKey },
          onPhase: (phase) => {
            if (controller.signal.aborted) return;
            pushNotification(runProgressNotification(draft.id, documentName, phase));
          },
        });
        const completed = {
          ...draft,
          ...result,
          id: draft.id,
          startedAt: draft.startedAt,
        };
        await upsertRun(completed);
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
        const cancelled = isAbortError(error) || controller.signal.aborted;
        const failed = failRun(draft, error, cancelled ? 'cancelled' : 'failed');
        await upsertRun(failed);
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
        setRunning(false);
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [upsertRun]
  );

  return { run, cancel, running };
}
