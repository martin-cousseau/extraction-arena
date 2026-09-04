import { useEffect } from 'react';
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
import { PIPELINES } from '@/lib/harness';
import { formatCost, formatMs } from '@/lib/utils';
import { useAppStore } from '@/store';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DashboardPage() {
  const navigate = useNavigate();
  const datasets = useAppStore((s) => s.datasets);
  const runs = useAppStore((s) => s.runs);
  const loadRuns = useAppStore((s) => s.loadRuns);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const completed = runs.filter((r) => r.status === 'completed' && r.evaluation);
  const last = completed[0];
  const spend = completed.reduce((s, r) => s + (r.usage.costUsd || 0), 0);
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, r) => s + (r.evaluation?.extractionScore ?? 0), 0) / completed.length)
    : 0;

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
      delta: `${runs.length} runs`,
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

  const scoreSeries: RevenuePoint[] = MONTHS.map((label, i) => {
    const monthRuns = completed.filter((r) => new Date(r.startedAt).getMonth() === i);
    const current =
      monthRuns.length === 0
        ? 0
        : monthRuns.reduce((s, r) => s + (r.evaluation?.extractionScore ?? 0), 0) / monthRuns.length;
    return { label, current, previous: 0 };
  });

  const volumeSeries: OrdersPoint[] = MONTHS.map((label, i) => ({
    label,
    current: runs.filter((r) => new Date(r.startedAt).getMonth() === i).length,
    previous: 0,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Eval harness results: DocAI is the native pipeline. Vision models remain available as deprecated adapters."
        actions={
          <Button variant="secondary" onClick={() => navigate('/datasets/new')}>
            Create dataset
          </Button>
        }
      />
      <StatCards stats={stats} />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RevenueChartCard title="Extraction score" data={scoreSeries} />
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
            </TableHeader>
            <TableBody>
              {runs.slice(0, 8).map((run) => (
                <TableRow key={run.id} className="cursor-pointer" onAction={() => navigate(`/runs/${run.id}`)}>
                  <TableCell>
                    {datasets.find((d) => d.id === run.datasetId)?.name ?? run.datasetId.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Chip color={PIPELINES[run.pipelineId].deprecated ? 'yellow' : 'blue'}>
                      {PIPELINES[run.pipelineId].label}
                    </Chip>
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
                  <TableCell className="tabular-nums">{formatMs(run.elapsedMs)}</TableCell>
                  <TableCell className="tabular-nums">{formatCost(run.usage.costUsd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
