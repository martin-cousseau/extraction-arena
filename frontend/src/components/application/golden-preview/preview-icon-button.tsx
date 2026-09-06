import { RiEyeLine } from '@remixicon/react';
import { Focusable } from 'react-aria-components';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';

export function PreviewIconButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TooltipTrigger delay={200}>
      <Focusable>
        <IconButton
          icon={RiEyeLine}
          size="small"
          aria-label={label}
          aria-haspopup="dialog"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onPress();
          }}
        />
      </Focusable>
      <Tooltip size="md">{label}</Tooltip>
    </TooltipTrigger>
  );
}
