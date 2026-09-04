import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { Surface } from '@/app/layout';
import { humanLabel, valueKind, type DatasetRecord, type GoldenValue } from '@/lib/dataset';

function asText(value: GoldenValue | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function GroundTruthPanel({ dataset }: { dataset: DatasetRecord }) {
  const entries = Object.entries(dataset.golden.golden_extraction);

  return (
    <Surface className="overflow-hidden p-0">
      <Table aria-label="Ground truth fields">
        <TableHeader>
          <TableColumn isRowHeader>Field</TableColumn>
          <TableColumn>Kind</TableColumn>
          <TableColumn>Expected</TableColumn>
        </TableHeader>
        <TableBody>
          {entries.map(([key, field]) => (
            <TableRow key={key}>
              <TableCell>
                <div>
                  <p className="text-body-medium">{humanLabel(key)}</p>
                  <p className="font-mono text-caption-1-regular text-text-tertiary">{key}</p>
                </div>
              </TableCell>
              <TableCell>{valueKind(field.value)}</TableCell>
              <TableCell>
                <span className="line-clamp-2 text-body-regular">{asText(field.value)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Surface>
  );
}
