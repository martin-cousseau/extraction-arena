import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectRemoteJobIds, purgePipelineJobsForRuns } from './purge-jobs';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('collectRemoteJobIds', () => {
  it('groups unique job ids by pipeline and skips blanks', () => {
    expect(
      collectRemoteJobIds([
        { pipelineId: 'docai', jobId: 'job-1' },
        { pipelineId: 'docai', jobId: ' job-1 ' },
        { pipelineId: 'docai', jobId: 'job-2' },
        { pipelineId: 'glm', jobId: 'vision-1' },
        { pipelineId: 'docai', jobId: '' },
        { pipelineId: 'docai' },
      ])
    ).toEqual({
      docai: ['job-1', 'job-2'],
      glm: ['vision-1'],
    });
  });
});

describe('purgePipelineJobsForRuns', () => {
  it('posts LlamaParse job ids and ignores vision runs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ jobId: 'job-1', deleted: true }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await purgePipelineJobsForRuns(
      [
        { pipelineId: 'docai', jobId: 'job-1' },
        { pipelineId: 'glm', jobId: 'vision-1' },
      ],
      { llamaKey: 'sess-key' }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/pipelines/docai/jobs/delete');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-llama-api-key': 'sess-key',
    });
    expect(JSON.parse(String(init.body))).toEqual({ jobIds: ['job-1'] });
  });

  it('does not call fetch when no pipeline exposes deleteJobs for the ids', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await purgePipelineJobsForRuns([{ pipelineId: 'gpt', jobId: 'x' }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
