import { useId } from 'react';
import { cx } from '@/utils/cx';

/**
 * Official LlamaParse stacked-sheet logomark from
 * https://www.llamaindex.ai/brand/llamaparse.svg (brand guidelines).
 * Wordmark letters are omitted so the card can use BoardUI type.
 */
function LlamaParseMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const gid = (n: number) => `${uid}-lp-${n}`;
  return (
    <svg
      viewBox="0 0 42 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cx('size-8 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M14.5691 30.3988C14.7156 30.3134 14.8822 30.2684 15.0519 30.2684H37.6622C38.6405 30.2684 38.99 31.5618 38.1449 32.0546L26.6395 38.7629C26.493 38.8483 26.3264 38.8934 26.1567 38.8934H3.54639C2.56808 38.8934 2.21854 37.5999 3.06368 37.1072L14.5691 30.3988Z"
        fill="#F5F5F5"
        stroke={`url(#${gid(0)})`}
        strokeWidth="1.34406"
      />
      <path
        d="M14.5691 23.6902C14.7156 23.6048 14.8822 23.5598 15.0519 23.5598H37.6622C38.6405 23.5598 38.99 24.8532 38.1449 25.346L26.6395 32.0543C26.493 32.1398 26.3264 32.1848 26.1567 32.1848H3.54639C2.56808 32.1848 2.21854 30.8913 3.06368 30.3985L14.5691 23.6902Z"
        fill="#F5F5F5"
        stroke={`url(#${gid(1)})`}
        strokeWidth="1.34406"
      />
      <path
        d="M14.5691 16.0241C14.7156 15.9387 14.8822 15.8937 15.0519 15.8937H37.6622C38.6405 15.8937 38.99 17.1871 38.1449 17.6799L26.6395 24.3883C26.493 24.4737 26.3264 24.5187 26.1567 24.5187H3.54639C2.56808 24.5187 2.21854 23.2252 3.06368 22.7324L14.5691 16.0241Z"
        fill="#F5F5F5"
        stroke={`url(#${gid(2)})`}
        strokeWidth="1.34406"
      />
      <path
        d="M14.5691 8.35723C14.7156 8.27182 14.8822 8.22681 15.0519 8.22681H37.6622C38.6405 8.22681 38.99 9.52023 38.1449 10.0131L26.6395 16.7214C26.493 16.8068 26.3264 16.8518 26.1567 16.8518H3.54639C2.56808 16.8518 2.21854 15.5583 3.06368 15.0656L14.5691 8.35723Z"
        fill="#F5F5F5"
        stroke={`url(#${gid(3)})`}
        strokeWidth="1.34406"
      />
      <path
        d="M14.5691 0.690443C14.7156 0.605012 14.8822 0.559998 15.0519 0.559998H37.6622C38.6405 0.559998 38.99 1.85345 38.1449 2.34622L26.6395 9.05456C26.493 9.13997 26.3264 9.18497 26.1567 9.18497H3.54639C2.56808 9.18497 2.21854 7.89154 3.06368 7.39877L14.5691 0.690443Z"
        fill="#F5F5F5"
        stroke={`url(#${gid(4)})`}
        strokeWidth="1.34406"
      />
      <defs>
        {[34.5809, 27.8723, 20.2062, 12.5393, 4.8725].map((y, i) => (
          <linearGradient
            key={gid(i)}
            id={gid(i)}
            x1="-0.499848"
            y1={y}
            x2="41.7085"
            y2={y}
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#37D7FA" />
            <stop offset="0.4" stopColor="#4B72FE" />
            <stop offset="0.68" stopColor="#FF8DF2" />
            <stop offset="1" stopColor="#FF8705" />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

export function LlamaParseLogo({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'flex size-10 shrink-0 items-center justify-center rounded-2lg bg-background-secondary-default',
        className,
      )}
    >
      <LlamaParseMark className="size-7" />
    </span>
  );
}
