import { useEffect, useState } from 'react';

/** Ticking epoch ms while `enabled`; otherwise a frozen snapshot of `Date.now()`. */
export function useNow(enabled: boolean, intervalMs = 100): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
  return now;
}
