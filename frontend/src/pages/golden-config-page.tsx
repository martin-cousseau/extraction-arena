import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { humanLabel, valueKind, type DatasetRecord } from '@/lib/dataset';
import { useAppStore, useFieldMetricConfig } from '@/store';

function FieldConfigRow({ fieldKey, kind }: { fieldKey: string; kind: string }) {
  const config = useFieldMetricConfig(fieldKey);
  const setFieldMetricConfig = useAppStore((s) => s.setFieldMetricConfig);
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border-button-default p-4">
      <div>
        <p className="text-body-semibold text-text-primary">{humanLabel(fieldKey)}</p>
        <p className="font-mono text-caption-1-regular text-text-tertiary">
          {fieldKey} · {kind}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <SegmentedControl
          aria-label={`Match strategy for ${fieldKey}`}
          selectedKeys={new Set([config.matchStrategy])}
          onSelectionChange={(keys) => {
            const v = [...keys][0];
            if (v === 'exact' || v === 'partial') setFieldMetricConfig(fieldKey, { matchStrategy: v });
          }}
        >
          <SegmentedControlItem id="partial">Partial</SegmentedControlItem>
          <SegmentedControlItem id="exact">Exact</SegmentedControlItem>
        </SegmentedControl>
        {(kind === 'array' || kind === 'object') && (
          <SegmentedControl
            aria-label={`List mode for ${fieldKey}`}
            selectedKeys={new Set([config.listMode])}
            onSelectionChange={(keys) => {
              const v = [...keys][0];
              if (v === 'sequence' || v === 'set') setFieldMetricConfig(fieldKey, { listMode: v });
            }}
          >
            <SegmentedControlItem id="sequence">Sequence</SegmentedControlItem>
            <SegmentedControlItem id="set">Set</SegmentedControlItem>
          </SegmentedControl>
        )}
        <SegmentedControl
          aria-label={`Priority for ${fieldKey}`}
          selectedKeys={new Set([config.priority])}
          onSelectionChange={(keys) => {
            const v = [...keys][0];
            if (v === 'precision' || v === 'recall') setFieldMetricConfig(fieldKey, { priority: v });
          }}
        >
          <SegmentedControlItem id="precision">Precision</SegmentedControlItem>
          <SegmentedControlItem id="recall">Recall</SegmentedControlItem>
        </SegmentedControl>
      </div>
    </li>
  );
}

export function EvalConfigPanel({ dataset }: { dataset: DatasetRecord }) {
  const entries = Object.entries(dataset.golden.golden_extraction);

  return (
    <ul className="flex flex-col gap-2">
      {entries.map(([key, field]) => (
        <FieldConfigRow key={key} fieldKey={key} kind={valueKind(field.value)} />
      ))}
    </ul>
  );
}
