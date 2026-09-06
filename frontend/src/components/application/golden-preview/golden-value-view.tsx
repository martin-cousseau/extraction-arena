import type { ComponentType } from 'react';
import {
  RiDoubleQuotesL,
  RiKey2Line,
  RiListCheck3,
  RiListOrdered2,
  RiTextSnippet,
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { humanLabel, valueKind, type GoldenValue, type ValueKind } from '@/lib/dataset';
import { isAbsentValue, type ListMode } from '@/lib/evaluation';
import { goldenPreviewItems, itemCountLabel, kindMeta } from './golden-preview';

type IconComponent = ComponentType<{
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

function kindIcon(kind: ValueKind, listMode: ListMode): IconComponent {
  if (kind === 'string') return RiTextSnippet;
  if (kind === 'object') return RiKey2Line;
  return listMode === 'sequence' ? RiListOrdered2 : RiListCheck3;
}

export function GoldenKindChips({
  fieldKey,
  value,
  listMode,
}: {
  fieldKey: string;
  value: GoldenValue;
  listMode: ListMode;
}) {
  const kind = valueKind(value);
  const meta = kindMeta(kind, listMode);
  const count = itemCountLabel(value);
  const Icon = kindIcon(kind, listMode);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex size-8 items-center justify-center rounded-2lg bg-background-secondary-default text-foreground-icon-secondary">
        <Icon className="size-4" aria-hidden />
      </span>
      <Chip color={meta.color}>{meta.label}</Chip>
      {count && <Chip color="soft">{count}</Chip>}
      {fieldKey.endsWith('.ordered_steps') && <Chip color="cyan">Procedure</Chip>}
    </div>
  );
}

function AbsentState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-background-secondary-default px-6 py-12 text-center">
      <p className="text-title-3-medium text-text-primary">Not on the sheet</p>
      <p className="max-w-md text-body-regular text-text-secondary">
        This field is empty. Scoring treats it as absent.
      </p>
    </div>
  );
}

function StringShowcase({ text }: { text: string }) {
  return (
    <figure className="relative overflow-hidden rounded-2xl bg-background-secondary-default px-6 py-8">
      <RiDoubleQuotesL
        className="absolute top-4 left-4 size-8 text-foreground-icon-tertiary"
        aria-hidden
      />
      <blockquote className="relative pt-6">
        <p className="text-pretty break-words text-title-2-regular text-text-primary">{text}</p>
      </blockquote>
    </figure>
  );
}

function SequenceShowcase({ items }: { items: { label?: string; text: string }[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={`${item.label}-${index}`}
          className="flex gap-3 rounded-2xl border-l-2 border-accent-500 bg-background-secondary-default p-4"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background-tertiary-default text-body-semibold tabular-nums text-text-primary">
            {item.label ?? String(index + 1).padStart(2, '0')}
          </span>
          <p className="min-w-0 pt-1 break-words text-body-regular text-text-primary">{item.text}</p>
        </li>
      ))}
    </ol>
  );
}

function SetShowcase({ items }: { items: { text: string }[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={`${item.text}-${index}`}
          className="flex items-start gap-3 rounded-2xl bg-background-secondary-default p-4"
        >
          <span className="mt-2 size-2 shrink-0 rounded-full bg-accent-500" aria-hidden />
          <p className="min-w-0 break-words text-body-regular text-text-primary">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

function MapShowcase({ items }: { items: { key?: string; label?: string; text: string }[] }) {
  return (
    <dl className="overflow-hidden rounded-2xl border border-border-button-default">
      {items.map((item, index) => (
        <div
          key={item.key ?? `${item.label}-${index}`}
          className="flex flex-col gap-1 border-b border-separator-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-6"
        >
          <dt className="w-44 shrink-0 text-body-medium text-text-secondary">
            {item.label ?? humanLabel(item.key ?? '')}
          </dt>
          <dd className="min-w-0 break-words text-body-regular text-text-primary">{item.text}</dd>
        </div>
      ))}
    </dl>
  );
}

export function GoldenValueShowcase({
  value,
  listMode,
}: {
  value: GoldenValue;
  listMode: ListMode;
}) {
  if (isAbsentValue(value)) return <AbsentState />;
  const kind = valueKind(value);
  const items = goldenPreviewItems(value);
  if (kind === 'string') return <StringShowcase text={items[0]?.text ?? ''} />;
  if (kind === 'object') return <MapShowcase items={items} />;
  return listMode === 'sequence' ? (
    <SequenceShowcase items={items} />
  ) : (
    <SetShowcase items={items} />
  );
}

export function GoldenValueCompact({
  value,
  listMode,
}: {
  value: GoldenValue;
  listMode: ListMode;
}) {
  if (isAbsentValue(value)) {
    return <p className="text-body-regular text-text-tertiary">Not on the sheet</p>;
  }
  const kind = valueKind(value);
  const items = goldenPreviewItems(value);
  if (kind === 'string') {
    return <p className="line-clamp-3 text-body-regular text-text-secondary">{items[0]?.text}</p>;
  }
  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;
  return (
    <ul className="flex flex-col gap-1.5">
      {shown.map((item, index) => (
        <li key={`${item.text}-${index}`} className="flex min-w-0 items-start gap-2">
          {kind === 'object' ? (
            <span className="shrink-0 text-body-medium text-text-tertiary">{item.label}</span>
          ) : listMode === 'sequence' ? (
            <span className="w-5 shrink-0 text-body-medium tabular-nums text-text-tertiary">
              {item.label}
            </span>
          ) : (
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground-icon-tertiary" />
          )}
          <span className="min-w-0 truncate text-body-regular text-text-secondary">{item.text}</span>
        </li>
      ))}
      {extra > 0 && (
        <li className="text-body-medium text-text-tertiary">
          +{extra} more
        </li>
      )}
    </ul>
  );
}

export function goldenKindIcon(kind: ValueKind, listMode: ListMode): IconComponent {
  return kindIcon(kind, listMode);
}
