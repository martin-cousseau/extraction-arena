import { useState } from 'react';
import { Chip } from '@/components/base/badges/chip';
import { Surface } from '@/app/layout';
import { resolveFieldConfig } from '@/lib/evaluation';
import { humanLabel, valueKind, type DatasetRecord } from '@/lib/dataset';
import { useActiveEvalConfigMap } from '@/store';
import { GoldenFieldPreviewModal } from './golden-field-preview-modal';
import { kindMeta } from './golden-preview';
import { GoldenValueCompact, goldenKindIcon } from './golden-value-view';
import { PreviewIconButton } from './preview-icon-button';

export function GoldenShowcasePanel({ dataset }: { dataset: DatasetRecord }) {
  const entries = Object.entries(dataset.golden.golden_extraction);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const overrides = useActiveEvalConfigMap();

  return (
    <>
      {entries.length === 0 ? (
        <Surface>
          <p className="text-body-regular text-text-secondary">No golden fields yet.</p>
        </Surface>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map(([key, field]) => {
            const listMode = resolveFieldConfig(key, overrides[key]).listMode;
            const kind = valueKind(field.value);
            const meta = kindMeta(kind, listMode);
            const Icon = goldenKindIcon(kind, listMode);
            return (
              <Surface
                key={key}
                className="relative overflow-hidden p-0 transition-colors duration-150 hover:bg-background-tertiary-hover"
              >
                <div className="absolute top-3 right-3 z-10">
                  <PreviewIconButton
                    label={`Preview ${humanLabel(key)}`}
                    onPress={() => setSelectedKey(key)}
                  />
                </div>
                <button
                  type="button"
                  className="flex h-full w-full flex-col gap-3 rounded-3xl p-4 pr-14 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring"
                  onClick={() => setSelectedKey(key)}
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-2lg bg-background-secondary-default text-foreground-icon-secondary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-semibold text-text-primary">{humanLabel(key)}</span>
                    <span className="mt-0.5 block truncate font-mono text-caption-1-regular text-text-tertiary">
                      {key}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <Chip color={meta.color}>{meta.label}</Chip>
                  </span>
                  <GoldenValueCompact value={field.value} listMode={listMode} />
                </button>
              </Surface>
            );
          })}
        </div>
      )}
      <GoldenFieldPreviewModal
        entries={entries}
        selectedKey={selectedKey}
        onSelectKey={setSelectedKey}
        onClose={() => setSelectedKey(null)}
      />
    </>
  );
}
