import { describe, expect, it } from 'vitest';
import { isEnvelopeKey, llamaExtractDataSchema } from './extractSchema';

describe('llamaExtractDataSchema', () => {
  it('keeps domain sections and drops the app envelope', () => {
    const schema = llamaExtractDataSchema();
    const keys = Object.keys(schema.properties ?? {});
    expect(keys).toContain('vehicle');
    expect(keys).toContain('responder_information');
    expect(keys).toContain('warnings');
    expect(keys).not.toContain('record_id');
    expect(keys).not.toContain('lifecycle_status');
    expect(keys).not.toContain('review');
    expect(keys).not.toContain('provenance');
    expect(schema.required).toEqual(['vehicle', 'responder_information']);
  });

  it('classifies envelope keys', () => {
    expect(isEnvelopeKey('record_id')).toBe(true);
    expect(isEnvelopeKey('vehicle')).toBe(false);
  });
});
