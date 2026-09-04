import type { ReactNode } from 'react';
import { RadioCard } from '@/components/base/radio/radio-card';
import { cx } from '@/utils/cx';
import type { PipelineDefinition } from '../types';

/** Shared launch-modal option: pipeline logo + label + description. */
export function PipelineCard({
  pipeline,
  selected = false,
  children,
}: {
  pipeline: PipelineDefinition;
  selected?: boolean;
  children?: ReactNode;
}) {
  const showExtras = Boolean(selected && children);

  return (
    <div
      className={cx(showExtras && 'overflow-hidden rounded-2lg border border-border-button-default')}
    >
      <RadioCard
        value={pipeline.id}
        leading={<pipeline.Logo />}
        title={pipeline.label}
        description={pipeline.description}
        truncateDescription={false}
        className={showExtras ? 'rounded-none border-0' : undefined}
      />
      {showExtras ? (
        <div
          className="border-t border-border-button-default px-4 py-2.5"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
