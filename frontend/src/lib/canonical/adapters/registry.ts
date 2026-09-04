import type { RescueSheetAdapter, SourceContext, NormalizeResult } from './types';
import { TeslaRescueSheetAdapter } from './tesla';

/** Registry of free-form OEM adapters. VLM output uses `normalizeVlmToDraft`, not this list. */
export const ADAPTERS: RescueSheetAdapter[] = [TeslaRescueSheetAdapter];

/** Find the first adapter that recognizes the source, or null. */
export function pickAdapter(input: unknown): RescueSheetAdapter | null {
  for (const adapter of ADAPTERS) {
    try {
      if (adapter.canHandle(input)) return adapter;
    } catch {
      // A throwing canHandle must never crash ingestion.
    }
  }
  return null;
}

/** Normalize via the registry; returns null when no adapter recognizes input. */
export function normalizeWithAdapter(
  input: unknown,
  context: SourceContext
): NormalizeResult | null {
  const adapter = pickAdapter(input);
  if (!adapter) return null;
  return adapter.normalize(input, context);
}
