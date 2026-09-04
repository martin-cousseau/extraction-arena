import { Surface } from '@/app/layout';
import { Chip } from '@/components/base/badges/chip';
import { humanLabel } from '@/lib/dataset';
import type { InsightSeverity, JudgeInsights } from '@/lib/evaluation/types';

const SEVERITY_CHIP: Record<InsightSeverity, 'rose' | 'yellow' | 'lime'> = {
  high: 'rose',
  medium: 'yellow',
  low: 'lime',
};

export function RunInsights({ insights }: { insights: JudgeInsights }) {
  return (
    <Surface className="mt-6">
      <p className="text-headline-semibold text-text-primary">Judge insights</p>
      <p className="mt-1 text-caption-1-regular text-text-tertiary">
        Overlay from {insights.model}. Does not change official scores.
      </p>
      <p className="mt-3 text-body-regular text-text-primary">{insights.summary}</p>
      {insights.themes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {insights.themes.map((theme) => (
            <li key={theme.title} className="rounded-xl bg-background-secondary-default p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body-medium text-text-primary">{theme.title}</p>
                <Chip color={SEVERITY_CHIP[theme.severity]} variant="caption">
                  {theme.severity}
                </Chip>
              </div>
              {theme.detail ? (
                <p className="mt-1 text-body-regular text-text-secondary">{theme.detail}</p>
              ) : null}
              {theme.fields.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {theme.fields.map((key) => (
                    <Chip key={key} color="soft" variant="caption">
                      {humanLabel(key)}
                    </Chip>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {insights.strengths.length > 0 && (
        <ul className="mt-4 list-disc pl-5 text-body-regular text-text-secondary">
          {insights.strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
