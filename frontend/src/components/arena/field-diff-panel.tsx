import { Chip } from '@/components/base/badges/chip';
import { WordDiff } from '@/components/arena/word-diff';
import type { GoldenValue } from '@/lib/dataset';
import type { FieldEvaluation } from '@/lib/evaluation/types';
import { cx } from '@/utils/cx';
import { buildFieldDiffRows, type DiffStatus, type FieldDiffRow } from './field-diff';

const STATUS_CHIP: Record<DiffStatus, { color: 'lime' | 'yellow' | 'rose' | 'cyan'; label: string }> = {
  match: { color: 'lime', label: 'Match' },
  partial: { color: 'yellow', label: 'Partial' },
  missing: { color: 'rose', label: 'Missing' },
  extra: { color: 'cyan', label: 'Extra' },
};

function SideText({
  text,
  status,
  side,
}: {
  text?: string;
  status: DiffStatus;
  side: 'expected' | 'actual';
}) {
  if (!text) {
    return <span className="text-body-regular text-text-tertiary">—</span>;
  }
  const strike = side === 'expected' && status === 'missing';
  const extra = side === 'actual' && status === 'extra';
  return (
    <span
      className={cx(
        'break-words text-body-regular text-text-primary',
        strike && 'text-text-error-primary line-through',
        extra && 'text-status-cyan-text',
      )}
    >
      {text}
    </span>
  );
}

function RowIndex({ row, numbered }: { row: FieldDiffRow; numbered: boolean }) {
  if (!numbered) return null;
  const n = (row.goldenIndex ?? row.modelIndex ?? 0) + 1;
  return <span className="w-6 shrink-0 text-caption-1-medium tabular-nums text-text-tertiary">{n}.</span>;
}

export function FieldDiffPanel({
  field,
  expected,
  actual,
}: {
  field: FieldEvaluation;
  expected: GoldenValue | undefined;
  actual: GoldenValue | undefined;
}) {
  const rows = buildFieldDiffRows(field, expected, actual);
  const numbered = field.kind !== 'string' && field.config.listMode === 'sequence';

  if (rows.length === 0) {
    return <p className="text-body-regular text-text-tertiary">Both sides are empty.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 md:grid">
        <p className="text-caption-1-medium text-text-tertiary">Expected</p>
        <p className="text-caption-1-medium text-text-tertiary">Returned</p>
        <p className="sr-only">Status</p>
      </div>
      {rows.map((row, idx) => {
        const chip = STATUS_CHIP[row.status];
        return (
          <div
            key={`${row.status}-${row.goldenIndex ?? 'x'}-${row.modelIndex ?? 'x'}-${idx}`}
            className="grid grid-cols-1 gap-2 rounded-xl bg-background-secondary-default p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start"
          >
            <div className="flex min-w-0 items-start gap-2">
              <RowIndex row={row} numbered={numbered} />
              <div className="min-w-0">
                <p className="mb-1 text-caption-1-medium text-text-tertiary md:hidden">Expected</p>
                <SideText text={row.expected} status={row.status} side="expected" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-caption-1-medium text-text-tertiary md:hidden">Returned</p>
              {row.status === 'partial' && row.expected && row.actual ? (
                <WordDiff golden={row.expected} actual={row.actual} />
              ) : (
                <SideText text={row.actual} status={row.status} side="actual" />
              )}
            </div>
            <Chip color={chip.color} variant="caption">
              {chip.label}
            </Chip>
          </div>
        );
      })}
    </div>
  );
}
