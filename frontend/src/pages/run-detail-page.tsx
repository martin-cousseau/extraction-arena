import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  RiCheckboxCircleLine,
  RiCheckboxMultipleLine,
  RiFocus3Line,
  RiListCheck3,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiPulseLine,
  RiTimeLine,
} from '@remixicon/react';
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking';
import { DeleteRunButton } from '@/components/application/delete-run-button';
import { DiffLegend } from '@/components/application/diff-legend';
import { StatCards, type Stat } from '@/components/application/dashboard/stat-cards';
import { RunInsights } from '@/components/application/run-insights';
import { RunQualityCharts } from '@/components/application/run-quality-charts';
import { FieldDiffPanel } from '@/components/arena/field-diff-panel';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
import { ChevronDownSmall } from '@/components/foundations/icons/chevrons';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { PageHeader, Surface } from '@/app/layout';
import { humanLabel, type DatasetRecord } from '@/lib/dataset';
import { loadDataset, loadRun } from '@/lib/db';
import { resolveFieldJudge, sortByPriority, type JudgeVerdict } from '@/lib/evaluation';
import { PIPELINES } from '@/lib/harness';
import { LLAMA_EXTRACT_TIER_LABELS } from '@/pipelines/llamaparse/tiers';
import { formatCost, formatMs, formatPct } from '@/lib/utils';
import { useJudgeRun } from '@/hooks/useJudgeRun';
import { useAppStore } from '@/store';
import { cx } from '@/utils/cx';

const FIELD_COLUMNS = 6;
const EXPAND_MS = 300;

function FieldExpand({
  open,
  onExited,
  children,
}: {
  open: boolean;
  onExited: () => void;
  children: ReactNode;
}) {
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(true);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => onExitedRef.current(), reduce ? 0 : EXPAND_MS);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <div
      className={cx(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
        shown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="overflow-hidden">
        <div className="border-t border-separator-border bg-background-secondary-default px-3 py-3">
          {children}
        </div>
      </div>
    </div>
  );
}

const VERDICT_CHIP: Record<JudgeVerdict, 'lime' | 'yellow' | 'rose' | 'neutral'> = {
  exact: 'lime',
  equivalent: 'lime',
  partial: 'yellow',
  different: 'rose',
  unknown: 'neutral',
};

function prfTone(value: number): 'lime' | 'rose' {
  return value >= 0.8 ? 'lime' : 'rose';
}

export function RunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const storeRun = useAppStore((s) => s.runs.find((r) => r.id === id));
  const [run, setRun] = useState(storeRun);
  const active = useAppStore((s) => s.active);
  const [dataset, setDataset] = useState<DatasetRecord | null>(
    active?.id === storeRun?.datasetId ? active : null
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mountedKey, setMountedKey] = useState<string | null>(null);

  useEffect(() => {
    if (storeRun) {
      setRun(storeRun);
      return;
    }
    if (id) void loadRun(id).then((r) => r && setRun(r));
  }, [id, storeRun]);

  useEffect(() => {
    if (!run?.datasetId) return;
    if (active?.id === run.datasetId) {
      setDataset(active);
      return;
    }
    let cancelled = false;
    void loadDataset(run.datasetId).then((record) => {
      if (!cancelled && record) setDataset(record);
    });
    return () => {
      cancelled = true;
    };
  }, [run?.datasetId, active]);

  const golden = dataset?.golden ?? null;
  const { analyze, judging, error: judgeError, canAnalyze, hasKey } = useJudgeRun(run, golden);

  const fields = useMemo(
    () => (run?.evaluation ? sortByPriority(run.evaluation.perField) : []),
    [run?.evaluation]
  );

  const fieldItems = useMemo(
    () => fields.map((field) => ({ ...field, id: field.key })),
    [fields],
  );

  const expandedKeys = useMemo(
    () => (mountedKey ? new Set<string>([mountedKey]) : new Set<string>()),
    [mountedKey],
  );

  const toggleField = (key: string) => {
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    setOpenKey(key);
    setMountedKey(key);
  };

  const handleExited = (key: string) => {
    setMountedKey((current) => (current === key ? null : current));
  };

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

  const qualityStats: Stat[] | null = useMemo(() => {
    if (!run?.evaluation) return null;
    const ev = run.evaluation;
    return [
      {
        icon: RiFocus3Line,
        label: 'Mean precision',
        value: formatPct(ev.meanPrecision),
        delta: `${ev.total} fields`,
        deltaColor: prfTone(ev.meanPrecision),
      },
      {
        icon: RiListCheck3,
        label: 'Mean recall',
        value: formatPct(ev.meanRecall),
        delta: `${ev.total} fields`,
        deltaColor: prfTone(ev.meanRecall),
      },
      {
        icon: RiPulseLine,
        label: 'Mean F1',
        value: formatPct(ev.meanF1),
        delta: `${ev.total} fields`,
        deltaColor: prfTone(ev.meanF1),
      },
      {
        icon: RiCheckboxMultipleLine,
        label: 'Exact rate',
        value: `${ev.accuracy}%`,
        delta: `${ev.matched}/${ev.total}`,
        deltaColor: ev.accuracy >= 80 ? 'lime' : 'rose',
      },
    ];
  }, [run]);

  if (!run) return <p className="text-body-regular text-text-secondary">Run not found.</p>;

  const pipeline = PIPELINES[run.pipelineId];

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
        description={`Started ${new Date(run.startedAt).toLocaleString()}${dataset ? ` · ${dataset.name}` : ''}${run.jobId ? ` · job ${run.jobId}` : ''}`}
        actions={
          <>
            <Chip color={pipeline.deprecated ? 'yellow' : 'blue'}>{pipeline.deprecated ? 'Deprecated' : 'Native'}</Chip>
            {run.extractTier ? (
              <Chip color="soft">{LLAMA_EXTRACT_TIER_LABELS[run.extractTier]}</Chip>
            ) : null}
            <Chip color={run.status === 'completed' ? 'lime' : run.status === 'failed' ? 'rose' : 'yellow'}>
              {run.status}
            </Chip>
            <Button
              variant="secondary"
              size="small"
              disabled={!canAnalyze || judging}
              title={
                !hasKey
                  ? 'Add an OpenAI key in Settings to run the judge.'
                  : run.status !== 'completed'
                    ? 'Wait for the run to finish.'
                    : !golden
                      ? 'Golden dataset is not loaded yet.'
                      : undefined
              }
              onClick={() => void analyze()}
            >
              {run.judgeInsights ? 'Re-analyze with judge' : 'Analyze with judge'}
            </Button>
            <Button variant="secondary" size="small" onClick={exportJson}>
              Export
            </Button>
            <DeleteRunButton
              runId={run.id}
              label="Delete run"
              onDeleted={() => navigate('/runs')}
            />
          </>
        }
      />
      {run.status === 'running' && (
        <div className="mb-4">
          <AgentThinking variant="infinity" label="Extracting" />
        </div>
      )}
      {judging && (
        <div className="mb-4">
          <AgentThinking variant="infinity" label="Judging answers" />
        </div>
      )}
      {run.error && <p className="mb-4 text-body-regular text-text-error-primary">{run.error}</p>}
      {judgeError && <p className="mb-4 text-body-regular text-text-error-primary">{judgeError}</p>}
      <StatCards stats={stats} />
      {qualityStats ? <StatCards className="mt-4" stats={qualityStats} /> : null}
      {run.evaluation ? <RunQualityCharts fields={run.evaluation.perField} /> : null}
      {run.judgeInsights ? <RunInsights insights={run.judgeInsights} /> : null}
      <Surface className="mt-6 overflow-hidden p-0">
        <Table aria-label="Field results" expandedKeys={expandedKeys}>
          <TableHeader>
            <TableColumn isRowHeader>Field</TableColumn>
            <TableColumn>Exact</TableColumn>
            <TableColumn>Precision</TableColumn>
            <TableColumn>Recall</TableColumn>
            <TableColumn>F1</TableColumn>
            <TableColumn>Judge</TableColumn>
          </TableHeader>
          <TableBody
            items={fieldItems}
            dependencies={[openKey, mountedKey, golden, run.data, run.judgeResults]}
            renderEmptyState={() => (
              <div className="px-3 py-4 text-body-regular text-text-secondary">
                Field diffs appear here after the run finishes.
              </div>
            )}
          >
            {(field) => {
              const verdict = run.judgeResults
                ? resolveFieldJudge(field.key, run.judgeResults)
                : undefined;
              const open = openKey === field.key;
              const fieldJudge =
                mountedKey === field.key && run.judgeResults
                  ? resolveFieldJudge(field.key, run.judgeResults)
                  : undefined;
              return (
                <TableRow
                  id={field.key}
                  textValue={humanLabel(field.key)}
                  className={cx('cursor-pointer', open && 'bg-background-tertiary-hover')}
                  onAction={() => toggleField(field.key)}
                  dependencies={[openKey, mountedKey, golden, run.data, run.judgeResults]}
                >
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <ChevronDownSmall
                        className={cx(
                          'mt-0.5 size-4 shrink-0 text-foreground-icon-tertiary transition-transform duration-300 ease-out motion-reduce:transition-none',
                          open && 'rotate-180',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-body-medium">{humanLabel(field.key)}</p>
                        <p className="font-mono text-caption-1-regular text-text-tertiary">{field.key}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip color={field.match ? 'lime' : 'rose'}>{field.match ? 'Yes' : 'No'}</Chip>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatPct(field.precision)}</TableCell>
                  <TableCell className="tabular-nums">{formatPct(field.recall)}</TableCell>
                  <TableCell className="tabular-nums">{formatPct(field.f1)}</TableCell>
                  <TableCell>
                    {verdict ? (
                      <Chip color={VERDICT_CHIP[verdict.verdict]} variant="caption">
                        {verdict.verdict}
                      </Chip>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  {mountedKey === field.key ? (
                    <TableRow
                      id={`${field.key}__detail`}
                      textValue={`${humanLabel(field.key)} comparison`}
                      className="bui-table-expand-row"
                    >
                      <TableCell colSpan={FIELD_COLUMNS} className="bui-table-expand">
                        <FieldExpand open={open} onExited={() => handleExited(field.key)}>
                          {fieldJudge?.rationale ? (
                            <p className="mb-3 text-body-regular text-text-secondary">{fieldJudge.rationale}</p>
                          ) : null}
                          <FieldDiffPanel
                            field={field}
                            expected={golden?.golden_extraction[field.key]?.value}
                            actual={run.data[field.key]}
                          />
                        </FieldExpand>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableRow>
              );
            }}
          </TableBody>
        </Table>
        {fields.length > 0 ? (
          <div className="border-t border-separator-border px-3 py-2.5">
            <p className="mb-2 text-caption-1-medium text-text-tertiary">Diff legend</p>
            <DiffLegend />
          </div>
        ) : null}
      </Surface>
    </div>
  );
}
