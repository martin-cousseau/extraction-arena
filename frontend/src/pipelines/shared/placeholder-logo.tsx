import { cx } from '@/utils/cx';

/** Fallback mark for pipelines that have no brand asset yet. */
export function PlaceholderLogo({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'flex size-10 shrink-0 items-center justify-center rounded-2lg bg-background-secondary-default',
        className,
      )}
      aria-hidden
    />
  );
}
