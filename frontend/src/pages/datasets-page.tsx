import { useNavigate } from 'react-router-dom';
import { RiAddLine, RiArrowRightSLine, RiDeleteBin6Line } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
import { PageHeader, Surface } from '@/app/layout';
import { useAppStore } from '@/store';

export function DatasetsPage() {
  const navigate = useNavigate();
  const datasets = useAppStore((s) => s.datasets);
  const loading = useAppStore((s) => s.catalogLoading);
  const removeDataset = useAppStore((s) => s.removeDataset);
  const selectDataset = useAppStore((s) => s.selectDataset);

  return (
    <div>
      <PageHeader
        title="Datasets"
        description="Each dataset is a PDF plus golden JSON, stored locally in IndexedDB."
        actions={
          <Button leadingIcon={RiAddLine} onClick={() => navigate('/datasets/new')}>
            Create dataset
          </Button>
        }
      />
      <Surface className="p-0 overflow-hidden">
        {loading ? (
          <p className="p-4 text-body-regular text-text-secondary">Loading…</p>
        ) : datasets.length === 0 ? (
          <p className="p-4 text-body-regular text-text-secondary">No datasets yet.</p>
        ) : (
          <Table aria-label="Datasets">
            <TableHeader>
              <TableColumn isRowHeader>Name</TableColumn>
              <TableColumn>Pages</TableColumn>
              <TableColumn>Fields</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn> </TableColumn>
            </TableHeader>
            <TableBody>
              {datasets.map((ds) => (
                <TableRow
                  key={ds.id}
                  className="group cursor-pointer"
                  onAction={() => {
                    void selectDataset(ds.id);
                    navigate(`/datasets/${ds.id}`);
                  }}
                >
                  <TableCell>
                    <span className="flex items-center justify-between gap-2">
                      <span>{ds.name}</span>
                      <RiArrowRightSLine
                        className="size-5 shrink-0 text-foreground-icon-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                        aria-hidden
                      />
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">{ds.pageCount}</TableCell>
                  <TableCell className="tabular-nums">{ds.fieldCount}</TableCell>
                  <TableCell className="tabular-nums">
                    {new Date(ds.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      aria-label={`Delete ${ds.name}`}
                      icon={RiDeleteBin6Line}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeDataset(ds.id);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
