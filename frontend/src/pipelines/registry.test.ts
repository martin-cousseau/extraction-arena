import { describe, expect, it } from 'vitest';
import { llamaExtractDataSchema, llamaExtractIncompatibilities } from './llamaparse/schema';
import {
  getPipeline,
  LAUNCHABLE_PIPELINES,
  PIPELINES,
  resolveLaunchable,
} from './registry';

describe('pipeline registry', () => {
  it('offers only LlamaParse in the launch modal', () => {
    expect(LAUNCHABLE_PIPELINES.map((p) => p.id)).toEqual(['docai']);
    expect(LAUNCHABLE_PIPELINES[0].label).toBe('LlamaParse');
    expect(LAUNCHABLE_PIPELINES[0].deprecated).toBe(false);
    expect(PIPELINES.glm.deprecated).toBe(true);
  });

  it('binds the LlamaParse schema to the docai pipeline id', () => {
    const pipeline = getPipeline('docai');
    expect(pipeline.dataSchema).toBe(llamaExtractDataSchema);
    const schema = pipeline.dataSchema?.();
    expect(llamaExtractIncompatibilities(schema)).toEqual([]);
    expect(pipeline.extract).toBeTypeOf('function');
    expect(pipeline.requiresPdf).toBe(true);
  });

  it('does not attach an extract schema to deprecated vision pipelines', () => {
    expect(getPipeline('glm').dataSchema).toBeUndefined();
    expect(getPipeline('gpt').kind).toBe('vision');
    expect(getPipeline('grok').requiresPdf).toBe(false);
  });

  it('falls back to LlamaParse when the stored default is not launchable', () => {
    expect(resolveLaunchable('glm')).toBe('docai');
    expect(resolveLaunchable('docai')).toBe('docai');
  });
});
