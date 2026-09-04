import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RiCheckboxCircleLine, RiMoneyDollarCircleLine, RiPercentLine, RiTimeLine } from '@remixicon/react';
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking';
import { StatCards, type Stat } from '@/components/application/dashboard/stat-cards';
import { WordDiff } from '@/components/arena/word-diff';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { PageHeader, Surface } from '@/app/layout';
import { humanLabel, type GoldenValue } from '@/lib/dataset';
import { PIPELINES } from '@/lib/harness';
import { loadRun } from '@/lib/db';
import { formatCost, formatMs } from '@/lib/utils';
import { useAppStore } from '@/store';

function asText(value: GoldenValue | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function RunDetailPage() {
  const { id } = useParams();
  const storeRun = useAppStore((s) => s.runs.find((r) => r.id === id));
  const [run, setRun] = useState(storeRun);
  const active = useAppStore((s) => s.active);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    if (storeRun) {
      setRun(storeRun);
      return;
    }
    if (id) void loadRun(id).then((r) => r && setRun(r));
  }, [id, storeRun]);

  const stats: Stat[] = useMemo(() => {
    if (!run?.evaluation) {
      return [
        { icon: RiPercentLine, label: 'Score', value: '—', delta: run?.status ?? '', deltaColor: 'neutral' },
        { icon: RiCheckboxCircleLine, label: 'Exact', value: '—', delta: 'Waiting', deltaColor: 'neutral' },
        { icon: RiTimeLine, label: 'Duration', value: run ? formatMs(run.elapsedMs) : '—', delta: '', deltaColor: 'neutral' },
        { icon: RiMoneyDollarCircleLine, label: 'Cost', value: run ? formatCost(run.usage.costUsd) : '—', delta: '', deltaColor: 'neutral' },
      ];
    }
    return [
      {
        icon: RiPercentLine,
        label: 'Extraction score',
        value: String(run.evaluation.extractionScore),
        delta: `${run.evaluation.partialAccuracy}% partial`,
        deltaColor: 'lime',
      },
      {
        icon: RiCheckboxCircleLine,
        label: 'Exact matches',
        value: `${run.evaluation.matched}/${run.evaluation.total}`,
        delta: `${run.evaluation.accuracy}%`,
        deltaColor: 'lime',
      },
      {
        icon: RiTimeLine,
        label: 'Duration',
        value: formatMs(run.elapsedMs),
        delta: new Date(run.startedAt).toLocaleString(),
        deltaColor: 'neutral',
      },
      {
        icon: RiMoneyDollarCircleLine,
        label: 'Cost',
        value: formatCost(run.usage.costUsd),
        delta: run.usage.credits != null ? `${run.usage.credits} credits` : `${run.usage.promptTokens ?? 0} tok in`,
        deltaColor: 'neutral',
      },
    ];
  }, [run]);

  if (!run) return <p className="text-body-regular text-text-secondary">Run not found.</p>;

  const pipeline = PIPELINES[run.pipelineId];
  const golden = active?.id === run.datasetId ? active.golden : null;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title={pipeline.label}
        description={`Started ${new Date(run.startedAt).toLocaleString()}${run.jobId ? ` · job ${run.jobId}` : ''}`}
        actions={
          <>
            <Chip color={pipeline.deprecated ? 'yellow' : 'blue'}>{pipeline.deprecated ? 'Deprecated' : 'Native'}</Chip>
            <Chip color={run.status === 'completed' ? 'lime' : run.status === 'failed' ? 'rose' : 'yellow'}>
              {run.status}
            </Chip>
            <Button variant="secondary" size="small" onClick={exportJson}>
              Export
            </Button>
          </>
        }
      />
      {run.status === 'running' && (
        <div className="mb-4">
          <AgentThinking variant="infinity" label="Extracting" />
        </div>
      )}
      {run.error && <p className="mb-4 text-body-regular text-text-error-primary">{run.error}</p>}
      <StatCards stats={stats} />
      <Surface className="mt-6 p-0 overflow-hidden">
        <Table aria-label="Field results">
          <TableHeader>
            <TableColumn isRowHeader>Field</TableColumn>
            <TableColumn>Exact</TableColumn>
            <TableColumn>Partial</TableColumn>
            <TableColumn>F1</TableColumn>
          </TableHeader>
          <TableBody>
            {(run.evaluation?.perField ?? []).map((field) => {
              const expected = golden?.golden_extraction[field.key]?.value;
              const actual = run.data[field.key];
              return (
                <TableRow key={field.key} onAction={() => setOpenKey(openKey === field.key ? null : field.key)}>
                  <TableCell>
                    <p className="text-body-medium">{humanLabel(field.key)}</p>
                    <p className="font-mono text-caption-1-regular text-text-tertiary">{field.key}</p>
                    {openKey === field.key && (
                      <div className="mt-2">
                        <WordDiff golden={asText(expected)} actual={asText(actual)} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip color={field.match ? 'lime' : 'rose'}>{field.match ? 'Yes' : 'No'}</Chip>
                  </TableCell>
                  <TableCell className="tabular-nums">{Math.round(field.partial * 100)}%</TableCell>
                  <TableCell className="tabular-nums">{field.f1.toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Surface>
    </div>
  );
}
