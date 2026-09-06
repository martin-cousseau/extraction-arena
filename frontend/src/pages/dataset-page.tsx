import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { RiArrowDownSLine, RiArrowUpSLine, RiEyeLine } from '@remixicon/react';
import { FileUpload } from '@/components/base/file-upload/file-upload';
import { Chip } from '@/components/base/badges/chip';
import { Pagination } from '@/components/base/pagination/pagination';
import { Tab, TabList, TabPanel, Tabs } from '@/components/base/tabs/tabs';
import { PageHeader, Surface } from '@/app/layout';
import { convertPdfToPages } from '@/lib/api';
import type { DatasetRecord } from '@/lib/dataset';
import { validate } from '@/lib/canonical/validate';
import { GoldenShowcasePanel } from '@/components/application/golden-preview/golden-showcase-panel';
import { EvalConfigPanel } from '@/pages/golden-config-page';
import { GroundTruthPanel } from '@/pages/ground-truth-page';
import { useAppStore } from '@/store';

type DatasetTab = 'ground-truth' | 'showcase' | 'config';

function tabFromPath(pathname: string): DatasetTab {
  if (pathname.endsWith('/config')) return 'config';
  if (pathname.endsWith('/showcase')) return 'showcase';
  return 'ground-truth';
}

export function DatasetPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const active = useAppStore((s) => s.active);
  const selectDataset = useAppStore((s) => s.selectDataset);
  const attachPdf = useAppStore((s) => s.attachPdf);
  const updateActiveDataset = useAppStore((s) => s.updateActiveDataset);
  const [page, setPage] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(true);
  const [tab, setTab] = useState<DatasetTab>(() => tabFromPath(location.pathname));

  useEffect(() => {
    setPage(1);
    setPdfError(null);
    setPdfOpen(true);
  }, [id]);

  useEffect(() => {
    setTab(tabFromPath(location.pathname));
  }, [location.pathname]);

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
            lockOnComplete
            processingLabel="Converting at 300 DPI…"
            completeLabel="Converted successfully!"
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
                const message = e instanceof Error ? e.message : 'Upload failed.';
                setPdfError(message);
                throw e instanceof Error ? e : new Error(message);
              }
            }}
          />
        </Surface>
      )}

      {current && (
        <Surface className="mb-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            aria-label={pdfOpen ? 'Hide PDF' : 'Show PDF'}
            aria-expanded={pdfOpen}
            aria-controls="dataset-pdf-viewer"
            onClick={() => setPdfOpen((open) => !open)}
          >
            <span className="text-headline-semibold text-text-primary">Pages</span>
            <span className="flex items-center gap-2">
              <span className="text-body-regular text-text-secondary">
                {current.page} / {active.pages.length}
              </span>
              {pdfOpen ? (
                <RiArrowUpSLine className="size-5 text-foreground-icon-secondary" aria-hidden />
              ) : (
                <RiArrowDownSLine className="size-5 text-foreground-icon-secondary" aria-hidden />
              )}
            </span>
          </button>
          {pdfOpen && (
            <div id="dataset-pdf-viewer">
              <img
                src={current.dataUrl}
                alt={`Page ${current.page}`}
                className="mx-auto mt-3 max-h-[520px] w-auto max-w-full rounded-2xl border border-border-button-default"
              />
              <Pagination
                className="mt-3"
                page={current.page}
                totalPages={active.pages.length}
                onChange={setPage}
              />
            </div>
          )}
        </Surface>
      )}

      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => {
          if (!id) return;
          const keyStr = String(key);
          const next: DatasetTab =
            keyStr === 'config' ? 'config' : keyStr === 'showcase' ? 'showcase' : 'ground-truth';
          if (next === tab) return;
          setTab(next);
          const path =
            next === 'config'
              ? `/datasets/${id}/config`
              : next === 'showcase'
                ? `/datasets/${id}/showcase`
                : `/datasets/${id}/ground-truth`;
          navigate(path);
        }}
      >
        <TabList aria-label="Dataset views">
          <Tab id="ground-truth">Ground Truth</Tab>
          <Tab id="showcase" icon={RiEyeLine} count={active.fieldCount}>
            Showcase
          </Tab>
          <Tab id="config">Eval Config</Tab>
        </TabList>
        <TabPanel id="ground-truth">
          <GroundTruthPanel dataset={active} />
        </TabPanel>
        <TabPanel id="showcase">
          <GoldenShowcasePanel dataset={active} />
        </TabPanel>
        <TabPanel id="config">
          <EvalConfigPanel dataset={active} />
        </TabPanel>
      </Tabs>
    </div>
  );
}
