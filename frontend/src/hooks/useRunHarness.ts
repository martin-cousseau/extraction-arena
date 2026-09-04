import { useCallback, useRef, useState } from 'react';
import { isAbortError } from '@/lib/api';
import {
  createRunningRecord,
  executePipelineRun,
  failRun,
  type PipelineId,
} from '@/lib/harness';
import { useAppStore } from '@/store';

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
      setRunning(true);
      await upsertRun(draft);
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
        });
        const completed = {
          ...draft,
          ...result,
          id: draft.id,
          startedAt: draft.startedAt,
        };
        await upsertRun(completed);
        return completed;
      } catch (error) {
        const cancelled = isAbortError(error) || controller.signal.aborted;
        await upsertRun(failRun(draft, error, cancelled ? 'cancelled' : 'failed'));
        if (!cancelled) throw error;
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
