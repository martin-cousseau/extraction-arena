import { useMemo, useState } from 'react';
import { Focusable } from 'react-aria-components';
import { RiSortAlphabetAsc, RiSortAsc } from '@remixicon/react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';

import { Button } from '@/components/base/buttons/button';
import { Tooltip as Hint, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { humanLabel } from '@/lib/dataset';
import {
  aggregateBySection,
  histogramBins,
  meanPrf,
  scoreBand,
  type FieldEvaluation,
  type SectionAggregate,
} from '@/lib/evaluation';
import { formatPct } from '@/lib/utils';

const BAND_FILL: Record<ReturnType<typeof scoreBand>, string> = {
  green: 'var(--color-status-lime-text)',
  amber: 'var(--color-status-yellow-text)',
  red: 'var(--color-status-rose-text)',
};

const METRICS = [
  { key: 'precision', title: 'Precision' },
  { key: 'recall', title: 'Recall' },
  { key: 'f1', title: 'F1' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

type ChartPoint = {
  id: string;
  label: string;
  value: number;
  fill: string;
  hint?: string;
};

export type SectionChartOrder = 'normal' | 'value-asc';

export function orderSectionPoints<T extends { value: number; label: string }>(
  points: T[],
  order: SectionChartOrder,
): T[] {
  if (order === 'normal' || points.length < 2) return points;
  return [...points].sort((a, b) => a.value - b.value || a.label.localeCompare(b.label));
}

function sectionMean(section: SectionAggregate, metric: MetricKey): number {
  if (metric === 'precision') return section.meanPrecision;
  if (metric === 'recall') return section.meanRecall;
  return section.meanF1;
}

function shorten(label: string, max = 10): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function shortCategoryLabel(label: string, max = 12): string {
  if (label.length <= max) return label;
  const words = label.split(' ');
  if (words.length >= 2) {
    const two = `${words[0]} ${words[1]}`;
    if (two.length <= max) return two;
  }
  const first = words[0] ?? label;
  return first.length <= max ? first : shorten(label, max);
}

function ValueTooltip({
  active,
  payload,
  label,
  valueKind,
}: TooltipContentProps & { valueKind: 'percent' | 'count' }) {
  if (!active || payload.length === 0) return null;
  const item = payload[0];
  const raw = Number(item?.value ?? 0);
  const displayed = valueKind === 'percent' ? formatPct(raw) : String(raw);
  const hint = typeof item?.payload?.hint === 'string' ? item.payload.hint : undefined;
  return (
    <div className="rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1.5 shadow-dropdown">
      <p className="text-caption-1-medium text-text-secondary">{String(label ?? '')}</p>
      <p className="text-caption-1-medium tabular-nums text-text-primary">{displayed}</p>
      {hint ? <p className="text-caption-1-regular text-text-tertiary">{hint}</p> : null}
    </div>
  );
}

function PercentTooltip(props: TooltipContentProps) {
  return <ValueTooltip {...props} valueKind="percent" />;
}

function CountTooltip(props: TooltipContentProps) {
  return <ValueTooltip {...props} valueKind="count" />;
}

function formatAxisValue(value: number, valueKind: 'percent' | 'count'): string {
  return valueKind === 'percent' ? formatPct(value) : String(value);
}

function CategoryTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value?: unknown };
}) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="var(--color-text-tertiary)" fontSize={12}>
      {shortCategoryLabel(String(payload?.value ?? ''))}
    </text>
  );
}

function MiniBarChart({
  data,
  valueKind,
  ariaLabel,
  layout = 'horizontal',
}: {
  data: ChartPoint[];
  valueKind: 'percent' | 'count';
  ariaLabel: string;
  layout?: 'horizontal' | 'vertical';
}) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const numericMax = valueKind === 'percent' ? 1 : Math.max(1, Math.ceil(maxValue * 1.15));
  const isVertical = layout === 'vertical';
  const height = isVertical ? Math.min(320, Math.max(88, data.length * 22)) : 96;
  const numericTicks = {
    type: 'number' as const,
    domain: [0, numericMax] as [number, number],
    tickCount: 3,
    allowDecimals: valueKind === 'percent',
    tickFormatter: (value: number) => formatAxisValue(value, valueKind),
    tickLine: false,
    axisLine: false,
    tick: { fontSize: 12, fill: 'var(--color-text-tertiary)' },
  };
  const categoryTicks = {
    type: 'category' as const,
    dataKey: 'label',
    tickLine: false,
    axisLine: false,
    interval: 0 as const,
    tickFormatter: (value: string) => shorten(value, isVertical ? 14 : 10),
    tick: { fontSize: 12, fill: 'var(--color-text-tertiary)' },
  };

  return (
    <div className="w-full min-w-0" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 4, right: isVertical ? 12 : 6, bottom: 0, left: 0 }}
          barCategoryGap="24%"
        >
          {isVertical ? (
            <>
              <XAxis {...numericTicks} tickMargin={6} />
              <YAxis {...categoryTicks} width={86} tick={CategoryTick} />
            </>
          ) : (
            <>
              <YAxis {...numericTicks} width={valueKind === 'percent' ? 40 : 22} />
              <XAxis {...categoryTicks} tickMargin={8} interval={data.length <= 8 ? 0 : 'preserveStartEnd'} />
            </>
          )}
          <Tooltip
            content={valueKind === 'percent' ? PercentTooltip : CountTooltip}
            cursor={{ fill: 'var(--color-chart-track)', opacity: 0.5 }}
          />
          <Bar
            dataKey="value"
            radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive
            animationDuration={450}
            maxBarSize={22}
          >
            {data.map((point) => (
              <Cell key={point.id} fill={point.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionOrderToggle({
  title,
  order,
  onToggle,
}: {
  title: string;
  order: SectionChartOrder;
  onToggle: () => void;
}) {
  const valueSorted = order === 'value-asc';
  const label = valueSorted
    ? `Restore ${title} section order`
    : `Sort ${title} sections from low to high`;
  return (
    <TooltipTrigger delay={200}>
      <Focusable>
        <Button
          iconOnly
          size="xs"
          variant={valueSorted ? 'secondary' : 'ghost'}
          leadingIcon={valueSorted ? RiSortAlphabetAsc : RiSortAsc}
          aria-label={label}
          aria-pressed={valueSorted}
          data-section-order={order}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        />
      </Focusable>
      <Hint size="md">{label}</Hint>
    </TooltipTrigger>
  );
}

function MetricQualityCard({
  title,
  mean,
  sections,
  bins,
}: {
  title: string;
  mean: number;
  sections: ChartPoint[];
  bins: ChartPoint[];
}) {
  const [sectionOrder, setSectionOrder] = useState<SectionChartOrder>('normal');
  const orderedSections = useMemo(
    () => orderSectionPoints(sections, sectionOrder),
    [sections, sectionOrder],
  );

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl bg-background-secondary-default px-4 pt-4 pb-3">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-body-medium text-text-secondary">{title}</h2>
        <p className="text-title-2-medium tabular-nums text-text-primary">{formatPct(mean)}</p>
      </header>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-body-medium text-text-tertiary">By section</p>
          <SectionOrderToggle
            title={title}
            order={sectionOrder}
            onToggle={() => setSectionOrder((current) => (current === 'normal' ? 'value-asc' : 'normal'))}
          />
        </div>
        <MiniBarChart
          data={orderedSections}
          valueKind="percent"
          layout="vertical"
          ariaLabel={`${title} by section${sectionOrder === 'value-asc' ? ', sorted from low to high' : ''}`}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body-medium text-text-tertiary">Distribution</p>
        <MiniBarChart data={bins} valueKind="count" ariaLabel={`${title} field distribution`} />
      </div>
    </section>
  );
}

export function RunQualityCharts({ fields }: { fields: FieldEvaluation[] }) {
  if (fields.length === 0) return null;

  const means = meanPrf(fields);
  const sections = aggregateBySection(fields);

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      {METRICS.map((metric) => {
        const values = fields.map((field) => field[metric.key]);
        const bins = histogramBins(values);
        return (
          <MetricQualityCard
            key={metric.key}
            title={metric.title}
            mean={means[metric.key]}
            sections={sections.map((section) => {
              const value = sectionMean(section, metric.key);
              return {
                id: section.section,
                label: humanLabel(section.section),
                value,
                fill: BAND_FILL[scoreBand(value)],
                hint: `${section.count} field${section.count === 1 ? '' : 's'}`,
              };
            })}
            bins={bins.map((bin) => ({
              id: bin.label,
              label: `${Math.round(bin.start * 100)}–${Math.round(bin.end * 100)}`,
              value: bin.count,
              fill: BAND_FILL[scoreBand(bin.end)],
              hint: `${bin.count} field${bin.count === 1 ? '' : 's'}`,
            }))}
          />
        );
      })}
    </div>
  );
}
