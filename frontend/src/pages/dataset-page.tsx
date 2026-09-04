import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileUpload } from '@/components/base/file-upload/file-upload';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
import { PageHeader, Surface } from '@/app/layout';
import { convertPdfToPages } from '@/lib/api';
import type { DatasetRecord } from '@/lib/dataset';
import { validate } from '@/lib/canonical/validate';
import { useAppStore } from '@/store';
import { cx } from '@/utils/cx';

export function DatasetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const active = useAppStore((s) => s.active);
  const selectDataset = useAppStore((s) => s.selectDataset);
  const attachPdf = useAppStore((s) => s.attachPdf);
  const updateActiveDataset = useAppStore((s) => s.updateActiveDataset);
  const [page, setPage] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (id && active?.id !== id) void selectDataset(id);
  }, [id, active?.id, selectDataset]);

  if (!active || active.id !== id) {
    return <p className="text-body-regular text-text-secondary">Loading dataset…</p>;
  }

  const current = active.pages.find((p) => p.page === page) ?? active.pages[0];
  const issues = validate(active.canonical).issues.filter((i) => i.level === 'error');

  return (
    <div>
      <PageHeader
        title={active.name}
        description={`${active.pdfName} · ${active.pageCount} pages · ${active.fieldCount} fields · ${active.canonical.schema_version}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/datasets/${active.id}/ground-truth`)}>
              Ground truth
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/datasets/${active.id}/config`)}>
              Eval config
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip>{active.canonical.lifecycle_status}</Chip>
        {active.pdfBlob ? <Chip color="lime">PDF ready for DocAI</Chip> : <Chip color="yellow">PDF missing</Chip>}
        {issues.length > 0 && <Chip color="rose">{issues.length} validation issues</Chip>}
      </div>

      {!active.pdfBlob && (
        <Surface className="mb-4">
          <p className="mb-3 text-body-regular text-text-secondary">
            This dataset was saved without the original PDF. Re-upload it to run DocAI.
          </p>
          {pdfError && <p className="mb-2 text-body-regular text-text-error-primary">{pdfError}</p>}
          <FileUpload
            allowedExtensions={['pdf']}
            maxBytes={10 * 1024 * 1024}
            onUploadComplete={async (file) => {
              setPdfError(null);
              try {
                const converted = await convertPdfToPages(file);
                await updateActiveDataset({
                  pages: converted.pages,
                  pageCount: converted.pages.length,
                  dpi: converted.dpi,
                  pdfName: converted.pdfName,
                } as Partial<DatasetRecord>);
                await attachPdf(file, converted.pdfName);
              } catch (e) {
                setPdfError(e instanceof Error ? e.message : 'Upload failed.');
              }
            }}
          />
        </Surface>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface>
          <p className="mb-3 text-headline-semibold">Pages</p>
          {current ? (
            <img
              src={current.dataUrl}
              alt={`Page ${current.page}`}
              className="w-full rounded-2xl border border-border-button-default"
            />
          ) : (
            <p className="text-body-regular text-text-secondary">No pages.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1">
            {active.pages.map((p) => (
              <button
                key={p.page}
                type="button"
                onClick={() => setPage(p.page)}
                className={cx(
                  'rounded-lg px-2 py-1 text-caption-1-medium',
                  p.page === current?.page
                    ? 'bg-accent-100 text-accent-700'
                    : 'bg-background-secondary-default text-text-secondary',
                )}
              >
                {p.page}
              </button>
            ))}
          </div>
        </Surface>
        <Surface className="min-h-[320px] overflow-auto">
          <p className="mb-3 text-headline-semibold">Canonical record</p>
          <pre className="overflow-auto whitespace-pre-wrap font-mono text-body-2-regular text-text-secondary">
            {JSON.stringify(active.canonical, null, 2)}
          </pre>
        </Surface>
      </div>
      <p className="mt-4 text-body-regular text-text-tertiary">
        <Link to="/datasets" className="text-button-ghost-foreground hover:underline">
          Back to catalog
        </Link>
      </p>
    </div>
  );
}
