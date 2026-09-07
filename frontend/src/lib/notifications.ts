export type AppNotificationStatus = 'neutral' | 'information' | 'success' | 'error';

export type NotificationChipColor = 'lime' | 'rose' | 'cyan';

export type RunNotificationKind =
  | 'extracting'
  | 'evaluating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface NotificationChip {
  label: string;
  color: NotificationChipColor;
}

export interface AppNotification {
  id: string;
  title: string;
  description?: string;
  status: AppNotificationStatus;
  chip?: NotificationChip;
  runId: string;
  autoDismissDuration?: number;
  cancellable?: boolean;
}

type Listener = () => void;

let items: AppNotification[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotifications(): AppNotification[] {
  return items;
}

export function pushNotification(notification: AppNotification): void {
  items = [notification, ...items.filter((item) => item.id !== notification.id)];
  emit();
}

export function dismissNotification(id: string): void {
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return;
  items = next;
  emit();
}

export function dismissNotificationsForRun(runId: string): void {
  const next = items.filter((item) => item.runId !== runId);
  if (next.length === items.length) return;
  items = next;
  emit();
}

export function runStartNotificationId(runId: string): string {
  return `run-start-${runId}`;
}

export function runDoneNotificationId(runId: string): string {
  return `run-done-${runId}`;
}

const RUN_STATUS_CHIPS: Record<RunNotificationKind, NotificationChip> = {
  extracting: { label: 'Extracting', color: 'cyan' },
  evaluating: { label: 'Evaluating', color: 'cyan' },
  completed: { label: 'Completed', color: 'lime' },
  failed: { label: 'Failed', color: 'rose' },
  cancelled: { label: 'Cancelled', color: 'cyan' },
};

export function runStatusChip(kind: RunNotificationKind): NotificationChip {
  return RUN_STATUS_CHIPS[kind];
}

export function runProgressTitle(
  documentName: string,
  phase: 'extracting' | 'evaluating'
): string {
  return phase === 'evaluating'
    ? `${documentName} is getting evaluated`
    : `${documentName} is getting extracted`;
}

export function runProgressNotification(
  runId: string,
  documentName: string,
  phase: 'extracting' | 'evaluating'
): AppNotification {
  return {
    id: runStartNotificationId(runId),
    title: runProgressTitle(documentName, phase),
    status: 'information',
    chip: runStatusChip(phase),
    runId,
    cancellable: true,
  };
}
