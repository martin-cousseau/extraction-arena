import { afterEach, describe, expect, it, vi } from 'vitest';
import { llamaExtractClientConfig, runLlamaparseExtract } from './adapter';

const emptyVisionKeys = { zaiKey: '', openaiKey: '', xaiKey: '' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('llamaExtractClientConfig', () => {
  it('writes the selected value onto configuration.tier and leaves parse_tier agentic', () => {
    expect(llamaExtractClientConfig('turbo').tier).toBe('turbo');
    expect(llamaExtractClientConfig().tier).toBe('agentic');
    expect(llamaExtractClientConfig('cost_effective').parse_tier).toBe('agentic');
  });
});

describe('runLlamaparseExtract', () => {
  it('posts the selected extract tier in the configuration field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ extractResult: {}, usage: { credits: 1 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await runLlamaparseExtract(
      {
        datasetId: 'ds-1',
        pdfName: 'sheet.pdf',
        pdfBlob: new Blob(['pdf'], { type: 'application/pdf' }),
        pages: [],
        canonical: {},
      },
      { visionKeys: emptyVisionKeys, llamaTier: 'turbo' },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = init.body as FormData;
    const configuration = JSON.parse(String(body.get('configuration')));
    expect(configuration.tier).toBe('turbo');
  });

  it('defaults configuration.tier to agentic', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ extractResult: {}, usage: { credits: 1 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await runLlamaparseExtract(
      {
        datasetId: 'ds-1',
        pdfName: 'sheet.pdf',
        pdfBlob: new Blob(['pdf'], { type: 'application/pdf' }),
        pages: [],
        canonical: {},
      },
      { visionKeys: emptyVisionKeys },
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = init.body as FormData;
    expect(JSON.parse(String(body.get('configuration'))).tier).toBe('agentic');
  });
});
