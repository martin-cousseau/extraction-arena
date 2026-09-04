import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip } from '@/components/base/badges/chip';
import { Notification, NotificationViewport } from '@/components/base/notification/notification';
import {
  dismissNotification,
  getNotifications,
  subscribeNotifications,
} from '@/lib/notifications';

const ARENA_MARK = {
  src: '/favicon.svg',
  alt: 'Extraction Arena',
  className: 'rounded-lg',
};

export function RunNotifications() {
  const navigate = useNavigate();
  const toasts = useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications);

  return (
    <NotificationViewport position="bottom-right" aria-label="Run notifications">
      {toasts.map((toast) => (
        <Notification
          key={toast.id}
          title={
            toast.chip ? (
              <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0">{toast.title}</span>
                <Chip variant="bold" color={toast.chip.color}>
                  {toast.chip.label}
                </Chip>
              </span>
            ) : (
              toast.title
            )
          }
          description={toast.description}
          status={toast.status}
          avatar={ARENA_MARK}
          autoDismissDuration={toast.autoDismissDuration}
          onDismiss={() => dismissNotification(toast.id)}
          actions={[
            {
              label: 'View run',
              variant: 'primary',
              onClick: () => {
                dismissNotification(toast.id);
                navigate(`/runs/${toast.runId}`);
              },
            },
          ]}
        />
      ))}
    </NotificationViewport>
  );
}
