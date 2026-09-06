import type { GoldenValue, ValueKind } from '@/lib/dataset';
import { NOT_FOUND } from '@/lib/dataset';
import { toItems } from '@/lib/evaluation/normalize';
import type { FieldEvaluation } from '@/lib/evaluation/types';

export type DiffStatus = 'match' | 'partial' | 'missing' | 'extra';

export interface FieldDiffRow {
  status: DiffStatus;
  expected?: string;
  actual?: string;
  goldenIndex?: number;
  modelIndex?: number;
  similarity: number;
}

export function displayItem(raw: string, kind: ValueKind): string {
  if (kind === 'object') {
    const nul = raw.indexOf('\u0000');
    if (nul >= 0) return `${raw.slice(0, nul)}: ${raw.slice(nul + 1)}`;
  }
  return raw;
}

function isAbsentScalar(value: string): boolean {
  return value === '' || value === NOT_FOUND;
}

/**
 * Turn a field evaluation + raw values into display rows.
 * Uses the same alignments the scorer used (sequence vs set).
 */
export function buildFieldDiffRows(
  field: FieldEvaluation,
  expected: GoldenValue | undefined,
  actual: GoldenValue | undefined
): FieldDiffRow[] {
  if (field.kind === 'string') {
    const g = expected == null ? '' : String(expected);
    const m = actual == null ? '' : String(actual);
    const sim = field.alignments[0]?.similarity ?? (field.match ? 1 : 0);
    const gAbsent = isAbsentScalar(g);
    const mAbsent = isAbsentScalar(m);
    if (gAbsent && mAbsent) return [];
    if (gAbsent && !mAbsent) {
      return [{ status: 'extra', actual: m, similarity: 0, modelIndex: 0 }];
    }
    if (!gAbsent && mAbsent) {
      return [{ status: 'missing', expected: g, similarity: 0, goldenIndex: 0 }];
    }
    const status: DiffStatus = field.match || sim >= 1 ? 'match' : 'partial';
    return [
      {
        status,
        expected: g,
        actual: m,
        similarity: sim,
        goldenIndex: 0,
        modelIndex: 0,
      },
    ];
  }

  const empty: GoldenValue = field.kind === 'array' ? [] : {};
  const goldItems = toItems(expected ?? empty, field.kind);
  const modelItems = toItems(actual ?? empty, field.kind);
  const rows: FieldDiffRow[] = [];
  const usedModel = new Set<number>();

  // Persisted runs scored one-sided absent lists with empty alignments.
  // Rebuild missing/extra rows from the values so the panel isn't blank.
  if (field.alignments.length === 0) {
    for (let i = 0; i < goldItems.length; i++) {
      rows.push({
        status: 'missing',
        expected: displayItem(goldItems[i]!, field.kind),
        goldenIndex: i,
        similarity: 0,
      });
    }
    for (let j = 0; j < modelItems.length; j++) {
      rows.push({
        status: 'extra',
        actual: displayItem(modelItems[j]!, field.kind),
        modelIndex: j,
        similarity: 0,
      });
    }
    return rows;
  }

  for (const alignment of field.alignments) {
    const expectedText = goldItems[alignment.goldenIndex];
    const actualText =
      alignment.modelIndex != null ? modelItems[alignment.modelIndex] : undefined;
    if (alignment.modelIndex != null) usedModel.add(alignment.modelIndex);
    let status: DiffStatus;
    if (alignment.modelIndex == null) status = 'missing';
    else if (alignment.similarity >= 1) status = 'match';
    else status = 'partial';
    rows.push({
      status,
      expected: expectedText != null ? displayItem(expectedText, field.kind) : undefined,
      actual: actualText != null ? displayItem(actualText, field.kind) : undefined,
      goldenIndex: alignment.goldenIndex,
      modelIndex: alignment.modelIndex ?? undefined,
      similarity: alignment.similarity,
    });
  }

  for (let j = 0; j < modelItems.length; j++) {
    if (usedModel.has(j)) continue;
    rows.push({
      status: 'extra',
      actual: displayItem(modelItems[j]!, field.kind),
      modelIndex: j,
      similarity: 0,
    });
  }

  return rows;
}
