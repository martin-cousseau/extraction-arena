import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/base/buttons/button';
import { CloseButton } from '@/components/base/buttons/close-button';
import { RadioGroup } from '@/components/base/radio/radio';
import { Select, SelectItem } from '@/components/base/select/select';
import { loadDataset } from '@/lib/db';
import type { DatasetRecord } from '@/lib/dataset';
import { useAppStore } from '@/store';
import { cx } from '@/utils/cx';
import { getPipeline, LAUNCHABLE_PIPELINES, resolveLaunchable } from '../registry';
import { LlamaParseTierRadios } from '../llamaparse/tier-radios';
import { resolveLlamaExtractTier, type LlamaExtractTier } from '../llamaparse/tiers';
import type { PipelineId } from '../types';
import { PipelineCard } from './pipeline-card';

export interface LaunchRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (datasetId: string, pipelineId: PipelineId, options?: { llamaTier?: LlamaExtractTier }) => void;
}

/**
 * Pipeline picker shown before a run. Shell matches the BoardUI settings modal
 * (portal, dimmed backdrop, scale+fade panel, Escape / backdrop close).
 */
export function LaunchRunModal({ isOpen, onClose, onLaunch }: LaunchRunModalProps) {
  const titleId = useId();
  const descId = useId();
  const hintId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const datasets = useAppStore((s) => s.datasets);
  const active = useAppStore((s) => s.active);
  const zaiKey = useAppStore((s) => s.zaiKey);
  const openaiKey = useAppStore((s) => s.openaiKey);
  const xaiKey = useAppStore((s) => s.xaiKey);
  const setSelectedPipeline = useAppStore((s) => s.setSelectedPipeline);
  const setLlamaExtractTier = useAppStore((s) => s.setLlamaExtractTier);
  const setLastLaunchDatasetId = useAppStore((s) => s.setLastLaunchDatasetId);

  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<DatasetRecord | null>(null);
  const [pipelineId, setPipelineId] = useState<PipelineId>(() =>
    resolveLaunchable(useAppStore.getState().selectedPipeline),
  );
  const [llamaTier, setLlamaTier] = useState<LlamaExtractTier>(() =>
    resolveLlamaExtractTier(useAppStore.getState().llamaExtractTier),
  );

  const selected = getPipeline(resolveLaunchable(pipelineId));
  const hasPdf = Boolean(loaded?.pdfBlob);
  const hasPages = (loaded?.pages.length ?? 0) > 0;
  const missingKey =
    selected.id === 'glm'
      ? !zaiKey.trim()
      : selected.id === 'gpt'
        ? !openaiKey.trim()
        : selected.id === 'grok'
          ? !xaiKey.trim()
          : false;
  const canLaunch =
    Boolean(datasetId && loaded) &&
    (!selected.requiresPdf || hasPdf) &&
    (selected.kind !== 'vision' || hasPages) &&
    !missingKey;
  const datasetName = loaded?.name ?? datasets.find((d) => d.id === datasetId)?.name ?? 'this dataset';

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      const state = useAppStore.getState();
      setPipelineId(resolveLaunchable(state.selectedPipeline));
      setLlamaTier(resolveLlamaExtractTier(state.llamaExtractTier));
      setDatasetId(state.lastLaunchDatasetId ?? state.active?.id ?? state.datasets[0]?.id ?? null);
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      unmountTimer.current = setTimeout(() => setMounted(false), 320);
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !datasetId) {
      setLoaded(null);
      return;
    }
    if (active?.id === datasetId) {
      setLoaded(active);
      return;
    }
    let cancelled = false;
    void loadDataset(datasetId).then((record) => {
      if (!cancelled) setLoaded(record ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, datasetId, active]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  const launch = () => {
    const id = resolveLaunchable(pipelineId);
    const pipeline = getPipeline(id);
    if (!datasetId || !loaded) return;
    if (pipeline.requiresPdf && !loaded.pdfBlob) return;
    if (pipeline.kind === 'vision' && loaded.pages.length === 0) return;
    setSelectedPipeline(id);
    setLastLaunchDatasetId(datasetId);
    const tier = id === 'docai' ? llamaTier : undefined;
    if (tier) setLlamaExtractTier(tier);
    onLaunch(datasetId, id, tier ? { llamaTier: tier } : undefined);
  };

  const hint = !datasetId
    ? 'Choose a dataset to run.'
    : selected.requiresPdf && !hasPdf
      ? `This dataset has no original PDF. Re-upload it on the dataset page to run ${selected.label}.`
      : selected.kind === 'vision' && !hasPages
        ? `This dataset has no converted pages. Open it and re-upload the PDF to run ${selected.label}.`
        : missingKey
          ? `Add the ${selected.label} API key in Settings.`
          : null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close pipeline picker"
        tabIndex={-1}
        onClick={onClose}
        className={cx(
          'absolute inset-0 cursor-default bg-black/70 transition-opacity duration-300 ease-out',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div
        className={cx(
          'relative transform-gpu transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[opacity,transform,filter]',
          visible ? 'scale-100 opacity-100 blur-0' : 'scale-[0.85] opacity-0 blur-[4px]',
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={canLaunch ? descId : `${descId} ${hintId}`}
          tabIndex={-1}
          className="relative w-[480px] max-w-[calc(100vw-32px)] overflow-clip rounded-3xl bg-background-full shadow-xs outline-none"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              launch();
            }}
          >
            <div className="flex items-center justify-between px-8 pt-8 pb-3">
              <h2 id={titleId} className="text-title-3-medium text-text-primary">
                Launch run
              </h2>
              <CloseButton aria-label="Close pipeline picker" size="md" onClick={onClose} />
            </div>

            <div className="flex max-h-[min(70vh,640px)] flex-col gap-4 overflow-y-auto px-8 pb-4">
              <p id={descId} className="text-body-regular text-text-secondary">
                Choose a dataset and pipeline for {datasetName}.
              </p>

              <Select
                aria-label="Dataset"
                selectedKey={datasetId ?? undefined}
                onSelectionChange={(key) => {
                  if (key != null) setDatasetId(String(key));
                }}
                className="w-full"
                placeholder="Select a dataset"
              >
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.id} id={dataset.id} textValue={dataset.name}>
                    {dataset.name}
                  </SelectItem>
                ))}
              </Select>

              <RadioGroup
                aria-label="Pipeline"
                name="pipeline"
                value={pipelineId}
                onChange={(value) => setPipelineId(value as PipelineId)}
              >
                {LAUNCHABLE_PIPELINES.map((pipeline) => (
                  <PipelineCard
                    key={pipeline.id}
                    pipeline={pipeline}
                    selected={pipelineId === pipeline.id}
                  >
                    {pipeline.id === 'docai' ? (
                      <LlamaParseTierRadios value={llamaTier} onChange={setLlamaTier} />
                    ) : null}
                  </PipelineCard>
                ))}
              </RadioGroup>

              {hint ? (
                <p id={hintId} className="text-body-regular text-text-error-primary">
                  {hint}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 px-8 pt-2 pb-8">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canLaunch}>
                Launch
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
