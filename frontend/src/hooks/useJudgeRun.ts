import { useCallback, useRef, useState } from 'react';
import { isAbortError } from '@/lib/api';
import type { GoldenDataset } from '@/lib/dataset';
import { runJudgeInsights, runSemanticJudgeAndUplift } from '@/lib/evaluation';
import type { RunRecord } from '@/lib/harness';
import { useAppStore } from '@/store';

export function useJudgeRun(run: RunRecord | undefined, golden: GoldenDataset | null) {
  const openaiKey = useAppStore((s) => s.openaiKey);
  const upsertRun = useAppStore((s) => s.upsertRun);
  const [judging, setJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canAnalyze = Boolean(
    openaiKey.trim() && golden && run?.evaluation && run.status === 'completed'
  );

  const analyze = useCallback(async () => {
    if (!run?.evaluation || !golden || !openaiKey.trim()) {
      setError('Add an OpenAI API key in Settings to run the judge.');
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setJudging(true);
    setError(null);
    try {
      const judged = await runSemanticJudgeAndUplift(run.evaluation, golden, run.data, {
        apiKey: openaiKey,
        signal: controller.signal,
        priorResults: run.judgeResults,
      });
      let insights = run.judgeInsights;
      let insightError: string | undefined;
      try {
        insights = await runJudgeInsights(
          run.evaluation,
          golden,
          run.data,
          judged.results,
          { apiKey: openaiKey, signal: controller.signal }
        );
      } catch (reason) {
        if (isAbortError(reason) || controller.signal.aborted) throw reason;
        insightError = reason instanceof Error ? reason.message : String(reason);
      }
      await upsertRun({
        ...run,
        judgeResults: judged.results,
        judgeInsights: insights,
      });
      const message = judged.error ?? insightError;
      if (message) setError(message);
    } catch (reason) {
      if (isAbortError(reason) || controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setJudging(false);
    }
  }, [golden, openaiKey, run, upsertRun]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { analyze, cancel, judging, error, canAnalyze, hasKey: Boolean(openaiKey.trim()) };
}
