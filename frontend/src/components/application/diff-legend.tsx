import { Chip } from '@/components/base/badges/chip';

const ITEMS = [
  { color: 'lime' as const, label: 'Match' },
  { color: 'yellow' as const, label: 'Partial' },
  { color: 'rose' as const, label: 'Missing from extraction' },
  { color: 'cyan' as const, label: 'Extra in extraction' },
];

export function DiffLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ITEMS.map((item) => (
        <Chip key={item.label} color={item.color} variant="caption">
          {item.label}
        </Chip>
      ))}
    </div>
  );
}
