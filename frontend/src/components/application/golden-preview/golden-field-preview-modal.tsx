import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { CloseButton } from '@/components/base/buttons/close-button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Kbd } from '@/components/base/kbd/kbd';
import { humanLabel } from '@/lib/dataset';
import { resolveFieldConfig } from '@/lib/evaluation';
import { useAppStore } from '@/store';
import { cx } from '@/utils/cx';
import type { GoldenPreviewEntry } from './golden-preview';
import { GoldenKindChips, GoldenValueShowcase } from './golden-value-view';

export function GoldenFieldPreviewModal({
  entries,
  selectedKey,
  onSelectKey,
  onClose,
}: {
  entries: GoldenPreviewEntry[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  onClose: () => void;
}) {
  const isOpen = selectedKey != null;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const index = selectedKey ? entries.findIndex(([key]) => key === selectedKey) : -1;
  const current = index >= 0 ? entries[index] : null;
  const lastRef = useRef<GoldenPreviewEntry | null>(null);
  if (current) lastRef.current = current;
  const shown = lastRef.current;
  const fieldKey = shown?.[0] ?? '';
  const field = shown?.[1];
  const indexRef = useRef(index);
  indexRef.current = index;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const onSelectKeyRef = useRef(onSelectKey);
  onSelectKeyRef.current = onSelectKey;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const override = useAppStore((s) => {
    const id = s.active?.id;
    return id && fieldKey ? s.metricConfigs[id]?.[fieldKey] : undefined;
  });
  const config = resolveFieldConfig(fieldKey, override);

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
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
    const step = (delta: number) => {
      const list = entriesRef.current;
      if (list.length === 0) return;
      const from = indexRef.current < 0 ? 0 : indexRef.current;
      const next = (from + delta + list.length) % list.length;
      const key = list[next]?.[0];
      if (key) onSelectKeyRef.current(key);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!mounted || typeof document === 'undefined' || !shown || !field) return null;

  const canCycle = entries.length > 1;
  const shownIndex = shown ? entries.findIndex(([key]) => key === shown[0]) : -1;
  const position = shownIndex >= 0 ? shownIndex + 1 : 1;
  const cycleFrom = index >= 0 ? index : Math.max(0, shownIndex);

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close field preview"
        tabIndex={-1}
        onClick={onClose}
        className={cx(
          'absolute inset-0 cursor-default bg-black/70 transition-opacity duration-300 ease-out',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        className={cx(
          'relative w-full max-w-[44rem] transform-gpu transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[opacity,transform,filter]',
          visible ? 'scale-100 opacity-100 blur-0' : 'scale-[0.85] opacity-0 blur-[4px]',
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative flex max-h-[min(80vh,44rem)] flex-col overflow-clip rounded-3xl bg-background-full shadow-xs outline-none"
        >
          <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-title-3-medium text-text-primary">
                {humanLabel(fieldKey)}
              </h2>
              <p className="mt-1 font-mono text-caption-1-regular text-text-tertiary">{fieldKey}</p>
              <div className="mt-3">
                <GoldenKindChips fieldKey={fieldKey} value={field.value} listMode={config.listMode} />
              </div>
            </div>
            <CloseButton aria-label="Close field preview" size="md" onClick={onClose} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-4">
            <GoldenValueShowcase value={field.value} listMode={config.listMode} />
          </div>

          <div className="flex items-center justify-between gap-3 px-8 pt-2 pb-6">
            <p className="flex items-center gap-1.5 text-body-regular text-text-tertiary">
              <Kbd>Esc</Kbd>
              <span>close</span>
              {canCycle && (
                <>
                  <Kbd>←</Kbd>
                  <Kbd>→</Kbd>
                  <span>browse</span>
                </>
              )}
            </p>
            {canCycle && (
              <div className="flex items-center gap-2">
                <IconButton
                  icon={RiArrowLeftSLine}
                  size="small"
                  aria-label="Previous field"
                  onClick={() => {
                    const next = (cycleFrom - 1 + entries.length) % entries.length;
                    const key = entries[next]?.[0];
                    if (key) onSelectKey(key);
                  }}
                />
                <span className="min-w-14 text-center text-body-medium tabular-nums text-text-secondary">
                  {position} / {entries.length}
                </span>
                <IconButton
                  icon={RiArrowRightSLine}
                  size="small"
                  aria-label="Next field"
                  onClick={() => {
                    const next = (cycleFrom + 1) % entries.length;
                    const key = entries[next]?.[0];
                    if (key) onSelectKey(key);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
