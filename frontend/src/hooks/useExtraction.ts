import { useCallback } from 'react';
import {
  callVisionModel,
  isAbortError,
  GLM_PRICING,
  GPT_PRICING,
  GROK_PRICING,
  type ModelResult,
  type PageImage,
  type VisionConfig,
} from '@/lib/api';
import { buildCanonicalPrompt } from '@/lib/canonical/prompt';
import type { SourceContext } from '@/lib/canonical/adapters/types';
import { useAppStore, type ModelKey } from '@/store';
import type { GoldenValue } from '@/lib/dataset';
import { evaluateDataset, runSemanticJudgeAndUplift } from '@/lib/evaluation';

export interface RunResult {
  glm: ModelResult;
  gpt: ModelResult;
  grok: ModelResult;
}

/** Live vision calls for enabled models. Results commit independently; abort reverts a column to idle. */
export function useExtraction() {
  const active = useAppStore((s) => s.active);
  const customContexts = useAppStore((s) => s.customContexts);
  const zaiKey = useAppStore((s) => s.zaiKey);
  const openaiKey = useAppStore((s) => s.openaiKey);
  const xaiKey = useAppStore((s) => s.xaiKey);
  const enabledModels = useAppStore((s) => s.enabledModels);
  const setGlm = useAppStore((s) => s.setGlm);
  const setGpt = useAppStore((s) => s.setGpt);
  const setGrok = useAppStore((s) => s.setGrok);

  const run = useCallback(
    async (signal?: AbortSignal): Promise<Partial<RunResult>> => {
      if (!active) throw new Error('No dataset selected.');
      const pages: PageImage[] = active.pages;
      if (pages.length === 0) throw new Error('This dataset has no pages.');

      const documentContext = customContexts[active.id] ?? active.pdfName;
      const prompt = buildCanonicalPrompt(active.canonical, documentContext);
      const ctx: SourceContext = {
        recordId: active.id,
        receivedAt: new Date().toISOString(),
        sourcePages: pages.map((p) => ({ page_id: `file:${p.page}`, page_number: p.page })),
        sourceFormat: active.pdfName,
      };

      // Metric config at run start (judge uses the same map as the comparison UI).
      const configMap = useAppStore.getState().metricConfigs[active.id] ?? {};

      const setters: Record<ModelKey, (r: ModelResult) => void> = {
        glm: setGlm,
        gpt: setGpt,
        grok: setGrok,
      };

      const allConfigs: Array<{ key: ModelKey; cfg: VisionConfig }> = [
        {
          key: 'glm',
          cfg: {
            modelId: 'glm-5v-turbo',
            label: 'GLM-5V-Turbo',
            endpoint: 'https://api.z.ai/api/paas/v4/chat/completions',
            apiKey: zaiKey,
            ...GLM_PRICING,
          },
        },
        {
          key: 'gpt',
          cfg: {
            modelId: 'gpt-5.4-mini',
            label: 'GPT-5.4 mini',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            apiKey: openaiKey,
            ...GPT_PRICING,
          },
        },
        {
          key: 'grok',
          cfg: {
            modelId: 'grok-4.5',
            label: 'Grok 4.5',
            endpoint: 'https://api.x.ai/v1/chat/completions',
            apiKey: xaiKey,
            ...GROK_PRICING,
          },
        },
      ];

      const configs = allConfigs.filter(({ key }) => enabledModels[key]);
      if (configs.length === 0) return {};

      // Only set loading state for the models we're actually running.
      for (const { key, cfg } of configs) {
        setters[key](loadingResult(cfg.modelId, cfg.label));
      }

      const result: Partial<RunResult> = {};

      const commit = (key: ModelKey, value: ModelResult) => {
        setters[key](value);
        result[key] = value;
      };

      const tasks = configs.map(async ({ key, cfg }) => {
        try {
          const extracted = await callVisionModel(cfg, pages, prompt, ctx, signal);
          const det = evaluateDataset(extracted.data, active.golden, configMap);

          // Show deterministic scores immediately, then semantic-judge weak fields.
          let value: ModelResult = {
            ...extracted,
            status: 'done',
            evaluation: det,
            judgeStatus: 'judging',
          };
          commit(key, value);

          try {
            const judged = await runSemanticJudgeAndUplift(
              det,
              active.golden,
              extracted.data,
              { apiKey: openaiKey, signal }
            );
            value = {
              ...value,
              evaluation: judged.evaluation,
              judgeResults: judged.results,
              judgeStatus: judged.error ? 'error' : 'done',
              judgeError: judged.error,
            };
            commit(key, value);
          } catch (judgeReason) {
            if (isAbortError(judgeReason) || signal?.aborted) {
              commit(key, idleResult(cfg.modelId, cfg.label));
              return;
            }
            // Keep deterministic evaluation if judge fails.
            commit(key, {
              ...value,
              judgeStatus: 'error',
              judgeError:
                judgeReason instanceof Error ? judgeReason.message : String(judgeReason),
            });
          }
        } catch (reason) {
          // Abort is not an error — revert this column to idle; finished models keep their results.
          if (isAbortError(reason) || signal?.aborted) {
            commit(key, idleResult(cfg.modelId, cfg.label));
            return;
          }
          commit(key, errorResult(cfg.modelId, cfg.label, reason));
        }
      });

      await Promise.allSettled(tasks);

      return result;
    },
    [active, customContexts, zaiKey, openaiKey, xaiKey, enabledModels, setGlm, setGpt, setGrok]
  );

  return { run };
}

function idleResult(id: string, label: string): ModelResult {
  return {
    modelId: id,
    label,
    data: {},
    rawText: '',
    elapsedMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    status: 'idle',
  };
}

function loadingResult(id: string, label: string): ModelResult {
  return {
    ...idleResult(id, label),
    status: 'loading',
  };
}

function errorResult(id: string, label: string, reason: unknown): ModelResult {
  const message = reason instanceof Error ? reason.message : String(reason);
  return { ...idleResult(id, label), status: 'error', error: message };
}

export type { GoldenValue };
