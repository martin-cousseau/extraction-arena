import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiCheckboxCircleLine,
  RiDatabase2Line,
  RiMoneyDollarCircleLine,
  RiTimeLine,
} from '@remixicon/react';
import { OrdersChartCard, type OrdersPoint } from '@/components/application/dashboard/orders-chart-card';
import { RevenueChartCard, type RevenuePoint } from '@/components/application/dashboard/revenue-chart-card';
import { StatCards, type Stat } from '@/components/application/dashboard/stat-cards';
import { DeleteRunButton } from '@/components/application/delete-run-button';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
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
import { formatWeekTick, weekKey, weekStartsFromFirstToLast } from '@/lib/chart-weeks';
import { isCompletedEvalRun, isTickingRun, liveElapsedMs, PIPELINES, type RunRecord } from '@/lib/harness';
import { useNow } from '@/hooks/use-live-elapsed';
import { LLAMA_EXTRACT_TIER_LABELS } from '@/pipelines/llamaparse/tiers';
import { formatCost, formatMs } from '@/lib/utils';
import { useAppStore } from '@/store';

function LiveDuration({ run }: { run: RunRecord }) {
  const now = useNow(isTickingRun(run.status), 1000);
  return <>{formatMs(liveElapsedMs(run, now))}</>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const datasets = useAppStore((s) => s.datasets);
  const runs = useAppStore((s) => s.runs);
  const loadRuns = useAppStore((s) => s.loadRuns);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const completed = useMemo(() => runs.filter(isCompletedEvalRun), [runs]);
  const last = completed[0];
  const spend = completed.reduce((s, r) => s + (r.usage.costUsd || 0), 0);
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, r) => s + (r.evaluation?.extractionScore ?? 0), 0) / completed.length)
    : 0;

  const { scoreSeries, volumeSeries } = useMemo(() => {
    const weeks = weekStartsFromFirstToLast(completed.map((r) => r.startedAt));
    const byWeek = new Map<number, typeof completed>();
    for (const run of completed) {
      const key = weekKey(run.startedAt);
      const list = byWeek.get(key);
      if (list) list.push(run);
      else byWeek.set(key, [run]);
    }
    const spanYears =
      weeks.length > 0 && weeks[0].getFullYear() !== weeks[weeks.length - 1].getFullYear();
    const scoreSeries: RevenuePoint[] = [];
    const volumeSeries: OrdersPoint[] = [];
    for (const start of weeks) {
      const weekRuns = byWeek.get(start.getTime()) ?? [];
      const label = formatWeekTick(start, spanYears);
      const current =
        weekRuns.length === 0
          ? null
          : weekRuns.reduce((s, r) => s + (r.evaluation?.extractionScore ?? 0), 0) / weekRuns.length;
      scoreSeries.push({ label, current, previous: null });
      volumeSeries.push({ label, current: weekRuns.length, previous: 0 });
    }
    return { scoreSeries, volumeSeries };
  }, [completed]);

  const stats: Stat[] = [
    {
      icon: RiCheckboxCircleLine,
      label: 'Avg extraction score',
      value: completed.length ? `${avgScore}` : '—',
      delta: last ? `${last.evaluation?.matched ?? 0}/${last.evaluation?.total ?? 0} exact` : 'No runs',
      deltaColor: 'neutral',
    },
    {
      icon: RiDatabase2Line,
      label: 'Datasets',
      value: String(datasets.length),
      delta: `${completed.length} runs`,
      deltaColor: 'lime',
    },
    {
      icon: RiMoneyDollarCircleLine,
      label: 'Spend',
      value: formatCost(spend),
      delta: last?.usage.credits != null ? `${last.usage.credits} credits last` : 'Official Llama rate',
      deltaColor: 'neutral',
    },
    {
      icon: RiTimeLine,
      label: 'Last run',
      value: last ? formatMs(last.elapsedMs) : '—',
      delta: last ? PIPELINES[last.pipelineId].label : 'Idle',
      deltaColor: 'neutral',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Eval harness results across LlamaParse and vision pipelines."
      />
      <StatCards stats={stats} />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RevenueChartCard
          title="Extraction score"
          data={scoreSeries}
          formatValue={(value) => value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          formatTick={(value) => String(Math.round(value))}
          totals={{ current: avgScore, previous: 0 }}
        />
        <OrdersChartCard title="Runs" data={volumeSeries} />
      </div>
      <Surface className="mt-6 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-headline-semibold text-text-primary">Recent runs</h2>
          <Button variant="ghost" size="small" onClick={() => navigate('/runs')}>
            View all
          </Button>
        </div>
        {runs.length === 0 ? (
          <p className="px-4 pb-4 text-body-regular text-text-secondary">
            No runs yet. Create a dataset and launch DocAI.
          </p>
        ) : (
          <Table aria-label="Recent runs">
            <TableHeader>
              <TableColumn isRowHeader>Dataset</TableColumn>
              <TableColumn>Pipeline</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Score</TableColumn>
              <TableColumn>Duration</TableColumn>
              <TableColumn>Cost</TableColumn>
              <TableColumn>
                <span className="sr-only">Actions</span>
              </TableColumn>
            </TableHeader>
            <TableBody>
              {runs.slice(0, 8).map((run) => (
                <TableRow key={run.id} className="cursor-pointer" onAction={() => navigate(`/runs/${run.id}`)}>
                  <TableCell>
                    {datasets.find((d) => d.id === run.datasetId)?.name ?? run.datasetId.slice(0, 8)}
                  </TableCell>
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
                      <StatusDot
                        color={run.status === 'completed' ? 'green' : 'yellow'}
                      />
                      {run.status}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {run.evaluation ? `${run.evaluation.extractionScore}` : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <LiveDuration run={run} />
                  </TableCell>
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
