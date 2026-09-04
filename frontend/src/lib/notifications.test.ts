import { afterEach, describe, expect, it } from 'vitest';
import {
  dismissNotification,
  getNotifications,
  pushNotification,
  runDoneNotificationId,
  runProgressNotification,
  runProgressTitle,
  runStartNotificationId,
  runStatusChip,
} from './notifications';

afterEach(() => {
  for (const item of getNotifications()) dismissNotification(item.id);
});

describe('run notifications', () => {
  it('keeps start and done toasts on distinct ids so a result can replace a start', () => {
    const runId = 'run-1';
    pushNotification({
      id: runStartNotificationId(runId),
      title: 'Run started',
      status: 'information',
      runId,
    });
    expect(getNotifications()).toHaveLength(1);

    dismissNotification(runStartNotificationId(runId));
    pushNotification({
      id: runDoneNotificationId(runId),
      title: 'Run completed',
      status: 'success',
      runId,
    });

    const toasts = getNotifications();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.status).toBe('success');
    expect(toasts[0]?.id).toBe(runDoneNotificationId(runId));
  });

  it('uses error status for a failed run toast', () => {
    pushNotification({
      id: runDoneNotificationId('run-2'),
      title: 'Run failed',
      status: 'error',
      runId: 'run-2',
    });
    expect(getNotifications()[0]?.status).toBe('error');
  });

  it('names the document in extract and evaluate progress copy', () => {
    expect(runProgressTitle('Cybertruck', 'extracting')).toBe('Cybertruck is getting extracted');
    expect(runProgressTitle('Cybertruck', 'evaluating')).toBe('Cybertruck is getting evaluated');
  });

  it('replaces extract progress with evaluate progress on the same start toast', () => {
    const runId = 'run-3';
    pushNotification(runProgressNotification(runId, 'Cybertruck', 'extracting'));
    pushNotification(runProgressNotification(runId, 'Cybertruck', 'evaluating'));

    const toasts = getNotifications();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.id).toBe(runStartNotificationId(runId));
    expect(toasts[0]?.title).toBe('Cybertruck is getting evaluated');
    expect(toasts[0]?.chip).toEqual({ label: 'Evaluating', color: 'cyan' });
  });

  it('maps run status chips to lime, rose, and cyan', () => {
    expect(runStatusChip('extracting')).toEqual({ label: 'Extracting', color: 'cyan' });
    expect(runStatusChip('evaluating')).toEqual({ label: 'Evaluating', color: 'cyan' });
    expect(runStatusChip('cancelled')).toEqual({ label: 'Cancelled', color: 'cyan' });
    expect(runStatusChip('completed')).toEqual({ label: 'Completed', color: 'lime' });
    expect(runStatusChip('failed')).toEqual({ label: 'Failed', color: 'rose' });
  });
});
