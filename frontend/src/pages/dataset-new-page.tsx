import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/base/buttons/button';
import { FileUpload } from '@/components/base/file-upload/file-upload';
import { Input } from '@/components/base/input/input';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { PageHeader, Surface } from '@/app/layout';
import { convertPdfToPages, type PageImage } from '@/lib/api';
import { cx } from '@/utils/cx';
import { useAppStore } from '@/store';

const MAX_BYTES = 10 * 1024 * 1024;
type Stage = 'name' | 'pdf' | 'golden';

export function DatasetNewPage() {
  const navigate = useNavigate();
  const createDataset = useAppStore((s) => s.createDataset);
  const [stage, setStage] = useState<Stage>('name');
  const [name, setName] = useState('');
  const [pages, setPages] = useState<PageImage[]>([]);
  const [pdfName, setPdfName] = useState('');
  const [pdfBlob, setPdfBlob] = useState<Blob | undefined>();
  const [dpi, setDpi] = useState(300);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [goldenText, setGoldenText] = useState('');
  const [goldenError, setGoldenError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onPdf = async (file: File) => {
    setConvertError(null);
    setConverting(true);
    try {
      const result = await convertPdfToPages(file);
      setPages(result.pages);
      setPdfName(result.pdfName);
      setDpi(result.dpi);
      setPdfBlob(file);
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : 'Conversion failed.');
    } finally {
      setConverting(false);
    }
  };

  const save = async () => {
    setGoldenError(null);
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(goldenText);
    } catch (e) {
      setGoldenError(e instanceof Error ? e.message : 'Invalid JSON.');
      return;
    }
    setSaving(true);
    try {
      const id = await createDataset({ name, pdfName, dpi, pages, rawJson, pdfBlob });
      navigate(`/datasets/${id}`);
    } catch (e) {
      setGoldenError(e instanceof Error ? e.message : 'Could not save dataset.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Create dataset"
        description="Name the dataset, upload the source PDF (converted at 300 DPI), then paste golden JSON."
      />
      <Surface className="max-w-2xl">
        <SegmentedControl
          selectedKeys={new Set([stage])}
          onSelectionChange={(keys) => {
            const v = [...keys][0] as Stage | undefined;
            if (!v) return;
            if (v === 'pdf' && !name.trim()) return;
            if (v === 'golden' && pages.length === 0) return;
            setStage(v);
          }}
          aria-label="Create dataset stage"
          className="mb-6"
        >
          <SegmentedControlItem id="name">1. Name</SegmentedControlItem>
          <SegmentedControlItem id="pdf">2. PDF</SegmentedControlItem>
          <SegmentedControlItem id="golden">3. Golden JSON</SegmentedControlItem>
        </SegmentedControl>

        {stage === 'name' && (
          <div className="flex flex-col gap-4">
            <Input label="Dataset name" value={name} onChange={setName} placeholder="Cybertruck rescue sheet" />
            <Button disabled={!name.trim()} onClick={() => setStage('pdf')}>
              Continue
            </Button>
          </div>
        )}

        {stage === 'pdf' && (
          <div className="flex flex-col gap-4">
            <FileUpload
              allowedExtensions={['pdf']}
              maxBytes={MAX_BYTES}
              onUploadComplete={(file) => void onPdf(file)}
            />
            {converting && <p className="text-body-regular text-text-secondary">Converting at 300 DPI…</p>}
            {convertError && <p className="text-body-regular text-text-error-primary">{convertError}</p>}
            {pages.length > 0 && (
              <p className="text-body-regular text-text-secondary">
                {pdfName} · {pages.length} pages · {dpi} DPI
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStage('name')}>
                Back
              </Button>
              <Button disabled={pages.length === 0} onClick={() => setStage('golden')}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {stage === 'golden' && (
          <div className="flex flex-col gap-4">
            <label className="text-body-medium text-text-primary" htmlFor="golden-json">
              Golden JSON
            </label>
            <textarea
              id="golden-json"
              value={goldenText}
              onChange={(e) => setGoldenText(e.target.value)}
              rows={16}
              className={cx(
                'w-full rounded-xl border border-border-button-default bg-background-secondary-default p-3',
                'font-mono text-body-regular text-text-primary outline-none',
                'focus-visible:ring-2 focus-visible:ring-border-focus-ring',
              )}
              placeholder="{ ... rescue-sheet-ev-v1.1 or Tesla golden_extraction ... }"
            />
            {goldenError && <p className="text-body-regular text-text-error-primary">{goldenError}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStage('pdf')}>
                Back
              </Button>
              <Button disabled={!goldenText.trim() || saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save dataset'}
              </Button>
            </div>
          </div>
        )}
      </Surface>
    </div>
  );
}
