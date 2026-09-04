const controllers = new Map<string, AbortController>();
const removedIds = new Set<string>();

export function registerInFlightRun(id: string, controller: AbortController): void {
  controllers.set(id, controller);
}

export function unregisterInFlightRun(id: string): void {
  controllers.delete(id);
}

export function abortInFlightRun(id: string): void {
  controllers.get(id)?.abort();
}

export function markRunRemoved(id: string): void {
  removedIds.add(id);
  abortInFlightRun(id);
}

export function isRunRemoved(id: string): boolean {
  return removedIds.has(id);
}
