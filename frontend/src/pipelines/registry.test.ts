import { describe, expect, it } from 'vitest';
import { llamaExtractDataSchema, llamaExtractIncompatibilities } from './llamaparse/schema';
import {
  getPipeline,
  LAUNCHABLE_PIPELINES,
  PIPELINES,
  resolveLaunchable,
} from './registry';
import { PlaceholderLogo } from './shared/placeholder-logo';

describe('pipeline registry', () => {
  it('offers LlamaParse and the vision pipelines in the launch modal', () => {
    expect(LAUNCHABLE_PIPELINES.map((p) => p.id)).toEqual(['docai', 'glm', 'gpt', 'grok']);
    expect(LAUNCHABLE_PIPELINES[0].label).toBe('LlamaParse');
    expect(LAUNCHABLE_PIPELINES.every((p) => p.deprecated === false)).toBe(true);
  });

  it('binds the LlamaParse schema to the docai pipeline id', () => {
    const pipeline = getPipeline('docai');
    expect(pipeline.dataSchema).toBe(llamaExtractDataSchema);
    const schema = pipeline.dataSchema?.();
    expect(llamaExtractIncompatibilities(schema)).toEqual([]);
    expect(pipeline.extract).toBeTypeOf('function');
    expect(pipeline.deleteJobs).toBeTypeOf('function');
    expect(pipeline.requiresPdf).toBe(true);
  });

  it('does not attach an extract schema to vision pipelines', () => {
    expect(getPipeline('glm').dataSchema).toBeUndefined();
    expect(getPipeline('glm').deleteJobs).toBeUndefined();
    expect(getPipeline('gpt').kind).toBe('vision');
    expect(getPipeline('grok').requiresPdf).toBe(false);
  });

  it('keeps a stored vision pipeline launchable', () => {
    expect(resolveLaunchable('glm')).toBe('glm');
    expect(resolveLaunchable('docai')).toBe('docai');
  });

  it('uses provider logos for vision pipelines', () => {
    expect(PIPELINES.glm.Logo).not.toBe(PlaceholderLogo);
    expect(PIPELINES.gpt.Logo).not.toBe(PlaceholderLogo);
    expect(PIPELINES.grok.Logo).not.toBe(PlaceholderLogo);
  });
});
