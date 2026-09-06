import { describe, expect, it } from 'vitest';
import {
  base64ToBlob,
  blobToBase64,
  deserializeDataset,
  isNewer,
  recordTime,
  serializeDataset,
} from './arenaStore';
import type { DatasetRecord } from './dataset';

describe('recordTime / isNewer', () => {
  it('prefers updatedAt, then finishedAt, then createdAt', () => {
    expect(recordTime({ createdAt: 10 })).toBe(10);
    expect(recordTime({ createdAt: 10, updatedAt: 20 })).toBe(20);
    expect(recordTime({ startedAt: 5, finishedAt: 8 })).toBe(8);
    expect(isNewer({ updatedAt: 3 }, { updatedAt: 2 })).toBe(true);
    expect(isNewer({ createdAt: 1 }, { updatedAt: 4 })).toBe(false);
  });
});

describe('dataset blob roundtrip', () => {
  it('rehydrates a PDF blob from base64', async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]); // %PDF-1
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const rec = {
      id: 'ds-1',
      name: 'Cybertruck',
      pdfName: 'sheet.pdf',
      dpi: 300,
      pageCount: 1,
      fieldCount: 1,
      createdAt: 1,
      pages: [{ page: 1, width: 1, height: 1, dataUrl: 'data:image/png;base64,xx' }],
      pdfBlob: blob,
      canonical: { schema_version: 'rescue-sheet-ev-v1.1' },
      golden: { golden_extraction: {} },
    } as unknown as DatasetRecord;

    const serialized = await serializeDataset(rec);
    expect(serialized.pdfBase64).toBe(await blobToBase64(blob));
    expect(serialized.pdfType).toBe('application/pdf');

    const back = deserializeDataset(serialized);
    expect(back.pdfBlob).toBeInstanceOf(Blob);
    expect(back.pdfBlob?.type).toBe('application/pdf');
    expect(new Uint8Array(await back.pdfBlob!.arrayBuffer())).toEqual(bytes);
  });

  it('round-trips base64 helpers', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'application/pdf' });
    const b64 = await blobToBase64(blob);
    const again = base64ToBlob(b64, 'application/pdf');
    expect(new Uint8Array(await again.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });
});
