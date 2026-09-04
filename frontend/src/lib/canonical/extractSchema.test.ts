import { describe, expect, it } from 'vitest';
import {
  isEnvelopeKey,
  llamaExtractDataSchema,
  llamaExtractIncompatibilities,
} from './extractSchema';

describe('llamaExtractDataSchema', () => {
  const schema = llamaExtractDataSchema();

  it('keeps domain sections and drops the app envelope', () => {
    const keys = Object.keys(schema.properties ?? {});
    expect(keys).toContain('vehicle');
    expect(keys).toContain('responder_information');
    expect(keys).toContain('warnings');
    expect(keys).toContain('vehicle_layout');
    expect(keys).not.toContain('record_id');
    expect(keys).not.toContain('lifecycle_status');
    expect(keys).not.toContain('review');
    expect(keys).not.toContain('provenance');
    expect(keys).not.toContain('evidence');
    expect(schema.required).toEqual(['vehicle', 'responder_information']);
  });

  it('classifies envelope keys', () => {
    expect(isEnvelopeKey('record_id')).toBe(true);
    expect(isEnvelopeKey('vehicle')).toBe(false);
  });

  it('stays within the LlamaExtract JSON Schema subset', () => {
    expect(llamaExtractIncompatibilities(schema)).toEqual([]);
  });

  it('gives HV/LV systems and warnings real object item properties (LlamaExtract 400)', () => {
    const propulsion = schema.properties?.vehicle?.properties?.propulsion?.properties;
    const hvItems = propulsion?.high_voltage_systems?.items;
    const lvItems = propulsion?.low_voltage_systems?.items;
    const warningItems = schema.properties?.warnings?.items;

    expect(propulsion?.high_voltage_systems?.type).toBe('array');
    expect(propulsion?.low_voltage_systems?.type).toBe('array');
    expect(schema.properties?.warnings?.type).toBe('array');

    expect(hvItems?.type).toBe('object');
    expect(lvItems?.type).toBe('object');
    expect(warningItems?.type).toBe('object');

    expect(hvItems?.properties).toMatchObject({
      nominal_voltage_v: { type: 'number' },
      source_text: { type: 'string' },
    });
    expect(lvItems?.properties).toMatchObject({
      nominal_voltage_v: { type: 'number' },
      source_text: { type: 'string' },
    });
    expect(warningItems?.properties).toMatchObject({
      source_text: { type: 'string' },
    });
  });

  it('does not use const or type unions that LlamaExtract rewrites to nested anyOf', () => {
    const raw = JSON.stringify(schema);
    expect(raw).not.toContain('"const"');
    expect(raw).not.toContain('anyOf');
    expect(raw).not.toContain('["array","null"]');
    expect(raw).not.toContain('["object","null"]');
    expect(raw).not.toContain('["string","null"]');
  });

  it('nests responder procedures so extract is not an empty additionalProperties object', () => {
    const ri = schema.properties?.responder_information?.properties;
    expect(ri?.immobilization?.properties?.ordered_steps?.type).toBe('array');
    expect(ri?.immobilization?.properties?.ordered_steps?.items?.properties?.source_text?.type).toBe(
      'string'
    );
    expect(ri?.disable_direct_hazards?.properties?.ordered_steps?.type).toBe('array');
    expect(ri?.fire?.type).toBe('object');
    expect(ri?.submersion?.type).toBe('object');
  });
});
