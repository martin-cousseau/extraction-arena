import { useState } from 'react';
import { Chip } from '@/components/base/badges/chip';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { GoldenFieldPreviewModal } from '@/components/application/golden-preview/golden-field-preview-modal';
import { kindMeta } from '@/components/application/golden-preview/golden-preview';
import { PreviewIconButton } from '@/components/application/golden-preview/preview-icon-button';
import { Surface } from '@/app/layout';
import { resolveFieldConfig } from '@/lib/evaluation';
import { humanLabel, valueKind, type DatasetRecord, type GoldenValue } from '@/lib/dataset';
import { useActiveEvalConfigMap } from '@/store';

function asText(value: GoldenValue | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function GroundTruthPanel({ dataset }: { dataset: DatasetRecord }) {
  const entries = Object.entries(dataset.golden.golden_extraction);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const overrides = useActiveEvalConfigMap();

  return (
    <>
      <Surface className="overflow-hidden p-0">
        <Table aria-label="Ground truth fields">
          <TableHeader>
            <TableColumn isRowHeader>Field</TableColumn>
            <TableColumn>Kind</TableColumn>
            <TableColumn>Expected</TableColumn>
            <TableColumn className="w-16">
              <span className="sr-only">Preview</span>
            </TableColumn>
          </TableHeader>
          <TableBody>
            {entries.map(([key, field]) => {
              const listMode = resolveFieldConfig(key, overrides[key]).listMode;
              const meta = kindMeta(valueKind(field.value), listMode);
              return (
                <TableRow key={key}>
                  <TableCell>
                    <div>
                      <p className="text-body-medium">{humanLabel(key)}</p>
                      <p className="font-mono text-caption-1-regular text-text-tertiary">{key}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip color={meta.color}>{meta.label}</Chip>
                  </TableCell>
                  <TableCell>
                    <span className="line-clamp-2 text-body-regular">{asText(field.value)}</span>
                  </TableCell>
                  <TableCell>
                    <PreviewIconButton
                      label={`Preview ${humanLabel(key)}`}
                      onPress={() => setSelectedKey(key)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Surface>
      <GoldenFieldPreviewModal
        entries={entries}
        selectedKey={selectedKey}
        onSelectKey={setSelectedKey}
        onClose={() => setSelectedKey(null)}
      />
    </>
  );
}
