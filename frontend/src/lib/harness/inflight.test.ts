import { describe, expect, it } from 'vitest';
import {
  isRunRemoved,
  markRunRemoved,
  registerInFlightRun,
  unregisterInFlightRun,
} from './inflight';

describe('in-flight run removal', () => {
  it('aborts a registered controller when the run is removed', () => {
    const id = `run-${crypto.randomUUID()}`;
    const controller = new AbortController();
    registerInFlightRun(id, controller);
    markRunRemoved(id);
    expect(isRunRemoved(id)).toBe(true);
    expect(controller.signal.aborted).toBe(true);
    unregisterInFlightRun(id);
  });

  it('does not treat an unknown run as removed', () => {
    expect(isRunRemoved(`run-${crypto.randomUUID()}`)).toBe(false);
  });

  it('aborts only the matching in-flight controller', () => {
    const a = `run-${crypto.randomUUID()}`;
    const b = `run-${crypto.randomUUID()}`;
    const controllerA = new AbortController();
    const controllerB = new AbortController();
    registerInFlightRun(a, controllerA);
    registerInFlightRun(b, controllerB);
    markRunRemoved(a);
    expect(controllerA.signal.aborted).toBe(true);
    expect(controllerB.signal.aborted).toBe(false);
    unregisterInFlightRun(a);
    unregisterInFlightRun(b);
  });
});

