import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeleteRunButton } from '@/components/application/delete-run-button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { PageHeader, Surface } from '@/app/layout';
import { PIPELINES } from '@/lib/harness';
import { LLAMA_EXTRACT_TIER_LABELS } from '@/pipelines/llamaparse/tiers';
import { formatCost, formatMs, formatPct } from '@/lib/utils';
import { useAppStore } from '@/store';

export function RunsPage() {
  const navigate = useNavigate();
  const runs = useAppStore((s) => s.runs);
  const datasets = useAppStore((s) => s.datasets);
  const loadRuns = useAppStore((s) => s.loadRuns);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  return (
    <div>
      <PageHeader title="Runs" description="Every pipeline execution, newest first. Open a row for scores, cost, and field diffs." />
      <Surface className="p-0 overflow-hidden">
        {runs.length === 0 ? (
          <p className="p-4 text-body-regular text-text-secondary">No runs yet.</p>
        ) : (
          <Table aria-label="Runs">
            <TableHeader>
              <TableColumn isRowHeader>When</TableColumn>
              <TableColumn>Dataset</TableColumn>
              <TableColumn>Pipeline</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Score</TableColumn>
              <TableColumn>P</TableColumn>
              <TableColumn>R</TableColumn>
              <TableColumn>F1</TableColumn>
              <TableColumn>Duration</TableColumn>
              <TableColumn>Cost</TableColumn>
              <TableColumn>
                <span className="sr-only">Actions</span>
              </TableColumn>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id} className="cursor-pointer" onAction={() => navigate(`/runs/${run.id}`)}>
                  <TableCell className="tabular-nums">{new Date(run.startedAt).toLocaleString()}</TableCell>
                  <TableCell>{datasets.find((d) => d.id === run.datasetId)?.name ?? run.datasetId.slice(0, 8)}</TableCell>
                  <TableCell>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <Chip color={PIPELINES[run.pipelineId].deprecated ? 'yellow' : 'blue'}>
                        {PIPELINES[run.pipelineId].label}
                      </Chip>
                      {run.extractTier ? (
                        <Chip color="soft">{LLAMA_EXTRACT_TIER_LABELS[run.extractTier]}</Chip>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <StatusDot color={run.status === 'completed' ? 'green' : 'yellow'} />
                      {run.status}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">{run.evaluation?.extractionScore ?? '—'}</TableCell>
                  <TableCell className="tabular-nums">
                    {run.evaluation ? formatPct(run.evaluation.meanPrecision) : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {run.evaluation ? formatPct(run.evaluation.meanRecall) : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {run.evaluation ? formatPct(run.evaluation.meanF1) : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatMs(run.elapsedMs)}</TableCell>
                  <TableCell className="tabular-nums">{formatCost(run.usage.costUsd)}</TableCell>
                  <TableCell>
                    <DeleteRunButton
                      runId={run.id}
                      label={`Delete run ${new Date(run.startedAt).toLocaleString()}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
