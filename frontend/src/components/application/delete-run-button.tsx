import { RiDeleteBin6Line } from '@remixicon/react';
import { IconButton } from '@/components/base/buttons/icon-button';
import { useAppStore } from '@/store';

export function DeleteRunButton({
  runId,
  label = 'Delete run',
  onDeleted,
}: {
  runId: string;
  label?: string;
  onDeleted?: () => void;
}) {
  const removeRun = useAppStore((s) => s.removeRun);

  return (
    <IconButton
      aria-label={label}
      icon={RiDeleteBin6Line}
      size="small"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        void removeRun(runId)
          .then(() => onDeleted?.())
          .catch(() => undefined);
      }}
    />
  );
}
