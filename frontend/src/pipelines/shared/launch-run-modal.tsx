import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/base/buttons/button';
import { CloseButton } from '@/components/base/buttons/close-button';
import { RadioGroup } from '@/components/base/radio/radio';
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
  onLaunch: (pipelineId: PipelineId, options?: { llamaTier?: LlamaExtractTier }) => void;
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

  const active = useAppStore((s) => s.active);
  const setSelectedPipeline = useAppStore((s) => s.setSelectedPipeline);
  const setLlamaExtractTier = useAppStore((s) => s.setLlamaExtractTier);
  const [pipelineId, setPipelineId] = useState<PipelineId>(() =>
    resolveLaunchable(useAppStore.getState().selectedPipeline),
  );
  const [llamaTier, setLlamaTier] = useState<LlamaExtractTier>(() =>
    resolveLlamaExtractTier(useAppStore.getState().llamaExtractTier),
  );

  const selected = getPipeline(resolveLaunchable(pipelineId));
  const hasPdf = Boolean(active?.pdfBlob);
  const canLaunch = !selected.requiresPdf || hasPdf;
  const datasetName = active?.name ?? 'this dataset';

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      setPipelineId(resolveLaunchable(useAppStore.getState().selectedPipeline));
      setLlamaTier(resolveLlamaExtractTier(useAppStore.getState().llamaExtractTier));
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
    if (pipeline.requiresPdf && !hasPdf) return;
    setSelectedPipeline(id);
    const tier = id === 'docai' ? llamaTier : undefined;
    if (tier) setLlamaExtractTier(tier);
    onLaunch(id, tier ? { llamaTier: tier } : undefined);
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close pipeline picker"
        tabIndex={-1}
        onClick={onClose}
        className={cx(
          'absolute inset-0 cursor-default bg-black/70 transition-opacity duration-300 ease-out',
          visible ? 'opacity-100' : 'opacity-0',
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
          className="relative w-[440px] max-w-[calc(100vw-32px)] overflow-clip rounded-3xl bg-background-full shadow-xs outline-none"
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

            <div className="flex flex-col gap-4 px-8 pb-4">
              <p id={descId} className="text-body-regular text-text-secondary">
                Choose a pipeline for {datasetName}.
              </p>

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

              {selected.requiresPdf && !hasPdf ? (
                <p id={hintId} className="text-body-regular text-text-error-primary">
                  This dataset has no original PDF. Re-upload it on the dataset page to run{' '}
                  {selected.label}.
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
