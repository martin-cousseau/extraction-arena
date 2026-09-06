import {
  humanLabel,
  valueKind,
  type GoldenField,
  type GoldenValue,
  type ValueKind,
} from '@/lib/dataset';
import { isAbsentValue } from '@/lib/evaluation';
import type { ListMode } from '@/lib/evaluation';

export type GoldenPreviewEntry = [string, GoldenField];

export type GoldenPreviewItem = {
  key?: string;
  label?: string;
  text: string;
};

export function goldenPreviewItems(value: GoldenValue): GoldenPreviewItem[] {
  if (Array.isArray(value)) {
    return value.map((text, index) => ({
      label: String(index + 1).padStart(2, '0'),
      text,
    }));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).map(([key, text]) => ({
      key,
      label: humanLabel(key),
      text,
    }));
  }
  return [{ text: value }];
}

export function kindMeta(
  kind: ValueKind,
  listMode: ListMode,
): { label: string; color: 'gray' | 'cyan' | 'blue' | 'purple' } {
  if (kind === 'string') return { label: 'Text', color: 'gray' };
  if (kind === 'object') return { label: 'Map', color: 'purple' };
  return listMode === 'sequence' ? { label: 'Sequence', color: 'cyan' } : { label: 'List', color: 'blue' };
}

export function itemCountLabel(value: GoldenValue): string | null {
  if (isAbsentValue(value)) return null;
  if (Array.isArray(value)) return value.length === 1 ? '1 item' : `${value.length} items`;
  if (typeof value === 'object') {
    const n = Object.keys(value).length;
    return n === 1 ? '1 key' : `${n} keys`;
  }
  return null;
}

export function previewSnippet(value: GoldenValue, maxItems = 3): string {
  if (isAbsentValue(value)) return 'Not on the sheet';
  const items = goldenPreviewItems(value);
  if (valueKind(value) === 'string') return items[0]?.text ?? '';
  const shown = items.slice(0, maxItems).map((item) => item.text);
  const extra = items.length - shown.length;
  return extra > 0 ? `${shown.join(' · ')} · +${extra} more` : shown.join(' · ');
}
