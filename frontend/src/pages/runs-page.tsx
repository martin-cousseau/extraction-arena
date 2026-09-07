import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiDeleteBin6Line, RiDownload2Line } from '@remixicon/react';
import { DeleteRunButton } from '@/components/application/delete-run-button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { PageHeader, Surface } from '@/app/layout';
import { downloadRunTraces, isTickingRun, liveElapsedMs, PIPELINES, type RunRecord } from '@/lib/harness';
import { LLAMA_EXTRACT_TIER_LABELS } from '@/pipelines/llamaparse/tiers';
import { formatCost, formatMs, formatPct } from '@/lib/utils';
import { useNow } from '@/hooks/use-live-elapsed';
import { useAppStore } from '@/store';
import { cx } from '@/utils/cx';

function LiveDuration({ run }: { run: RunRecord }) {
  const now = useNow(isTickingRun(run.status), 1000);
  return <>{formatMs(liveElapsedMs(run, now))}</>;
}

export function RunsPage() {
  const navigate = useNavigate();
  const runs = useAppStore((s) => s.runs);
  const datasets = useAppStore((s) => s.datasets);
  const loadRuns = useAppStore((s) => s.loadRuns);
  const removeRun = useAppStore((s) => s.removeRun);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    const ids = new Set(runs.map((run) => run.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [runs]);

  const allSelected = runs.length > 0 && selected.size === runs.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedRuns = useMemo(
    () => runs.filter((run) => selected.has(run.id)),
    [runs, selected],
  );

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(runs.map((run) => run.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const downloadSelected = () => {
    downloadRunTraces(selectedRuns);
  };

  const deleteSelected = () => {
    const ids = [...selected];
    setSelected(new Set());
    void Promise.all(ids.map((id) => removeRun(id)));
  };

  return (
    <div>
      <PageHeader
        title="Runs"
        description="Every pipeline execution, newest first. Open a row for scores, cost, and field diffs."
        actions={
          runs.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {selected.size > 0 ? (
                <span className="text-body-medium text-text-secondary">{selected.size} selected</span>
              ) : null}
              <Button
                variant="secondary"
                leadingIcon={RiDownload2Line}
                disabled={selected.size === 0}
                onClick={downloadSelected}
              >
                Download
              </Button>
              <Button variant="danger" leadingIcon={RiDeleteBin6Line} disabled={selected.size === 0} onClick={deleteSelected}>
                Delete
              </Button>
            </div>
          ) : undefined
        }
      />
      <Surface className="p-0 overflow-hidden">
        {runs.length === 0 ? (
          <p className="p-4 text-body-regular text-text-secondary">No runs yet.</p>
        ) : (
          <Table aria-label="Runs">
            <TableHeader>
              <TableColumn isRowHeader>
                <span className="flex items-center gap-2">
                  <Checkbox
                    slot={null}
                    aria-label="Select all runs"
                    isSelected={allSelected}
                    isIndeterminate={someSelected}
                    onChange={toggleAll}
                  />
                  When
                </span>
              </TableColumn>
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
                <TableRow
                  key={run.id}
                  className="cursor-pointer"
                  style={
                    selected.has(run.id)
                      ? { backgroundColor: 'var(--color-background-secondary-default)' }
                      : undefined
                  }
                  onAction={() => navigate(`/runs/${run.id}`)}
                >
                  <TableCell className="tabular-nums">
                    <span className="flex items-center gap-2">
                      <span
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          slot={null}
                          aria-label={`Select run ${new Date(run.startedAt).toLocaleString()}`}
                          isSelected={selected.has(run.id)}
                          onChange={(checked) => toggleOne(run.id, checked)}
                        />
                      </span>
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>{datasets.find((d) => d.id === run.datasetId)?.name ?? run.datasetId.slice(0, 8)}</TableCell>
                  <TableCell>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <Chip color={PIPELINES[run.pipelineId].kind === 'native' ? 'blue' : 'cyan'}>
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
                  <TableCell className="tabular-nums">
                    <LiveDuration run={run} />
                  </TableCell>
                  <TableCell className="tabular-nums">{formatCost(run.usage.costUsd)}</TableCell>
                  <TableCell>
                    <span className={cx('inline-flex items-center gap-1')}>
                      <IconButton
                        aria-label={`Download run ${new Date(run.startedAt).toLocaleString()}`}
                        icon={RiDownload2Line}
                        size="small"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          downloadRunTraces([run]);
                        }}
                      />
                      <DeleteRunButton
                        runId={run.id}
                        label={`Delete run ${new Date(run.startedAt).toLocaleString()}`}
                      />
                    </span>
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
