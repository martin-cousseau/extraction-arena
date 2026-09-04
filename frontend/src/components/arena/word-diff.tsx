import { normalizeStr } from '@/lib/evaluation/normalize';
import { cx } from '@/utils/cx';

type UnifiedToken = { text: string; type: 'equal' | 'removed' | 'added' };

function toWords(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

export function diffUnified(golden: string, actual: string): UnifiedToken[] {
  const g = toWords(golden);
  const a = toWords(actual);
  const gn = g.map(normalizeStr);
  const an = a.map(normalizeStr);
  const n = g.length;
  const k = a.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(k + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = k - 1; j >= 0; j--) {
      dp[i][j] = gn[i] === an[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const tokens: UnifiedToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < k) {
    if (gn[i] === an[j]) {
      tokens.push({ text: g[i], type: 'equal' });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ text: g[i], type: 'removed' });
      i += 1;
    } else {
      tokens.push({ text: a[j], type: 'added' });
      j += 1;
    }
  }
  while (i < n) {
    tokens.push({ text: g[i], type: 'removed' });
    i += 1;
  }
  while (j < k) {
    tokens.push({ text: a[j], type: 'added' });
    j += 1;
  }
  return tokens;
}

export function WordDiff({ golden, actual }: { golden: string; actual: string }) {
  const tokens = diffUnified(golden, actual);
  if (tokens.length === 0) return <span className="text-text-tertiary">—</span>;
  return (
    <span className="break-words text-body-regular">
      {tokens.map((t, idx) => (
        <span
          key={`${t.type}-${idx}`}
          className={cx(
            t.type === 'equal' && 'text-text-primary',
            t.type === 'removed' && 'text-text-error-primary line-through',
            t.type === 'added' && 'text-button-ghost-foreground',
          )}
        >
          {idx > 0 ? ' ' : ''}
          {t.text}
        </span>
      ))}
    </span>
  );
}
