import { describe, expect, it } from 'vitest';
import type { DatasetRecord, GoldenDataset } from '../dataset';
import {
  alignDatasetGolden,
  goldenUsesProjectedPaths,
  migrateLegacyDataset,
} from './ingest';

describe('goldenUsesProjectedPaths', () => {
  it('accepts canonical projection keys', () => {
    expect(
      goldenUsesProjectedPaths({
        golden_extraction: {
          'vehicle.manufacturer': { value: 'Tesla' },
          'responder_information.submersion.ordered_steps': { value: ['Wear PPE'] },
        },
      })
    ).toBe(true);
  });

  it('rejects the pre-v1 Tesla bag', () => {
    expect(
      goldenUsesProjectedPaths({
        golden_extraction: {
          manufacturer: { value: 'Tesla' },
          airbag: { value: 'front' },
          coolant: { value: 'blue or orange' },
          submersion: { value: ['Wear PPE'] },
        },
      })
    ).toBe(false);
  });
});

describe('migrateLegacyDataset', () => {
  it('replaces Tesla bag keys with the canonical projection', () => {
    const rec = migrateLegacyDataset({
      id: 'ds-1',
      name: 'Cybertruck',
      pdfName: 'sheet.pdf',
      dpi: 300,
      pageCount: 1,
      fieldCount: 4,
      createdAt: 1,
      pages: [],
      golden: {
        golden_extraction: {
          manufacturer: { value: 'Tesla' },
          model: { value: 'Cybertruck' },
          airbag: { value: 'front' },
          submersion: { value: ['Wear appropriate PPE for water rescue.'] },
        },
      },
    });
    expect(goldenUsesProjectedPaths(rec.golden)).toBe(true);
    expect(rec.golden.golden_extraction['vehicle.manufacturer']?.value).toBe('Tesla');
    expect(rec.golden.golden_extraction['vehicle.model']?.value).toBe('Cybertruck');
    expect(rec.golden.golden_extraction.airbag).toBeUndefined();
    expect(rec.golden.golden_extraction.manufacturer).toBeUndefined();
  });
});

describe('alignDatasetGolden', () => {
  it('reprojects a canonical record that still carries Tesla keys', () => {
    const teslaGold: GoldenDataset = {
      golden_extraction: {
        manufacturer: { value: 'Tesla' },
        coolant: { value: 'blue or orange' },
      },
    };
    const rec = {
      id: 'ds-1',
      name: 'Cybertruck',
      pdfName: 'sheet.pdf',
      dpi: 300,
      pageCount: 1,
      fieldCount: 2,
      createdAt: 1,
      pages: [],
      canonical: {
        schema_version: 'rescue-sheet-ev-v1.1',
        record_id: 'ds-1',
        lifecycle_status: 'draft',
        vehicle: {
          manufacturer: 'Tesla',
          model: 'Cybertruck',
          propulsion: { primary_energy_source: 'battery_electric' },
        },
        responder_information: {},
      },
      golden: teslaGold,
    } as unknown as DatasetRecord;

    const aligned = alignDatasetGolden(rec);
    expect(aligned).not.toBe(rec);
    expect(aligned.golden.golden_extraction['vehicle.manufacturer']?.value).toBe('Tesla');
    expect(aligned.golden.golden_extraction.coolant).toBeUndefined();
  });
});
