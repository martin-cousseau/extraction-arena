import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { WordDiff } from '@/components/arena/word-diff';
import { Chip } from '@/components/base/badges/chip';
import { Select, SelectItem } from '@/components/base/select/select';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { PageHeader, Surface } from '@/app/layout';
import { humanLabel, valueKind, type GoldenValue } from '@/lib/dataset';
import { PIPELINES } from '@/lib/harness';
import { useAppStore } from '@/store';

function asText(value: GoldenValue | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function GroundTruthPage() {
  const { id } = useParams();
  const active = useAppStore((s) => s.active);
  const runs = useAppStore((s) => s.runs);
  const selectDataset = useAppStore((s) => s.selectDataset);
  const [runId, setRunId] = useState<string>('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    if (id && active?.id !== id) void selectDataset(id);
  }, [id, active?.id, selectDataset]);

  const completed = useMemo(
    () => runs.filter((r) => r.datasetId === active?.id && r.status === 'completed'),
    [runs, active?.id]
  );
  const selected = completed.find((r) => r.id === runId) ?? completed[0];

  if (!active) return <p className="text-body-regular text-text-secondary">Select a dataset.</p>;

  const entries = Object.entries(active.golden.golden_extraction);

  return (
    <div>
      <PageHeader
        title="Ground truth"
        description="Golden fields for this dataset. Expand a row to diff against a completed run."
        actions={
          completed.length > 0 ? (
            <Select
              aria-label="Compare run"
              selectedKey={selected?.id}
              onSelectionChange={(key) => setRunId(String(key))}
            >
              {completed.map((run) => (
                <SelectItem key={run.id} id={run.id}>
                  {PIPELINES[run.pipelineId].label} · {new Date(run.startedAt).toLocaleString()}
                </SelectItem>
              ))}
            </Select>
          ) : undefined
        }
      />
      <Surface className="p-0 overflow-hidden">
        <Table aria-label="Ground truth fields">
          <TableHeader>
            <TableColumn isRowHeader>Field</TableColumn>
            <TableColumn>Kind</TableColumn>
            <TableColumn>Expected</TableColumn>
            <TableColumn>Status</TableColumn>
          </TableHeader>
          <TableBody>
            {entries.map(([key, field]) => {
              const actual = selected?.data[key];
              const match = selected?.evaluation?.perField.find((f) => f.key === key)?.match;
              return (
                <TableRow key={key} onAction={() => setOpenKey(openKey === key ? null : key)}>
                  <TableCell>
                    <div>
                      <p className="text-body-medium">{humanLabel(key)}</p>
                      <p className="font-mono text-caption-1-regular text-text-tertiary">{key}</p>
                    </div>
                  </TableCell>
                  <TableCell>{valueKind(field.value)}</TableCell>
                  <TableCell>
                    <span className="line-clamp-2 text-body-regular">{asText(field.value)}</span>
                    {openKey === key && selected && (
                      <div className="mt-2">
                        <WordDiff golden={asText(field.value)} actual={asText(actual)} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {selected ? (
                      <Chip color={match ? 'lime' : 'rose'}>{match ? 'Match' : 'Miss'}</Chip>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Surface>
    </div>
  );
}
