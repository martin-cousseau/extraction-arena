import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteLlamaparseJobs, llamaExtractClientConfig, runLlamaparseExtract } from './adapter';

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

describe('deleteLlamaparseJobs', () => {
  it('does not call the backend when there are no job ids', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await deleteLlamaparseJobs(['', '  ']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts unique trimmed job ids and forwards the session key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ jobId: 'job-a', deleted: true }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await deleteLlamaparseJobs(['job-a', 'job-a', ' job-b '], { llamaKey: 'sess-key' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/pipelines/docai/jobs/delete');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-llama-api-key': 'sess-key',
    });
    expect(JSON.parse(String(init.body))).toEqual({ jobIds: ['job-a', 'job-b'] });
  });

  it('throws when the backend reports a failed job', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ jobId: 'job-a', deleted: false, error: 'denied' }] }),
      })
    );
    await expect(deleteLlamaparseJobs(['job-a'])).rejects.toThrow(/job-a/);
  });
});
