import type { DatasetMeta, DatasetRecord } from './dataset';
import type { RunRecord } from './harness/types';

/** Wire shape for a dataset: Blobs become base64 so any browser can rehydrate them. */
export interface SerializedDataset extends Omit<DatasetRecord, 'pdfBlob'> {
  pdfBase64?: string;
  pdfType?: string;
}

const HEALTH_MS = 2500;
const READ_MS = 30_000;
const WRITE_MS = 120_000;

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(b64: string, type: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function serializeDataset(rec: DatasetRecord): Promise<SerializedDataset> {
  const { pdfBlob, ...rest } = rec;
  if (!pdfBlob || pdfBlob.size === 0) return rest;
  return {
    ...rest,
    pdfBase64: await blobToBase64(pdfBlob),
    pdfType: pdfBlob.type || 'application/pdf',
  };
}

export function deserializeDataset(raw: SerializedDataset): DatasetRecord {
  const { pdfBase64, pdfType, ...rest } = raw;
  const rec: DatasetRecord = rest;
  if (pdfBase64) {
    rec.pdfBlob = base64ToBlob(pdfBase64, pdfType || 'application/pdf');
  }
  return rec;
}

export function recordTime(rec: {
  updatedAt?: number;
  createdAt?: number;
  startedAt?: number;
  finishedAt?: number | null;
}): number {
  return rec.updatedAt ?? rec.finishedAt ?? rec.createdAt ?? rec.startedAt ?? 0;
}

export function isNewer(
  a: { updatedAt?: number; createdAt?: number; startedAt?: number; finishedAt?: number | null },
  b: { updatedAt?: number; createdAt?: number; startedAt?: number; finishedAt?: number | null }
): boolean {
  return recordTime(a) > recordTime(b);
}

export async function arenaStoreAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal: timeoutSignal(HEALTH_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchDatasetMetas(): Promise<DatasetMeta[] | null> {
  try {
    const res = await fetch('/api/store/datasets', { signal: timeoutSignal(READ_MS) });
    if (!res.ok) return null;
    const data = await readJson<unknown>(res);
    return Array.isArray(data) ? (data as DatasetMeta[]) : null;
  } catch {
    return null;
  }
}

export async function fetchDataset(id: string): Promise<DatasetRecord | null> {
  try {
    const res = await fetch(`/api/store/datasets/${encodeURIComponent(id)}`, {
      signal: timeoutSignal(READ_MS),
    });
    if (!res.ok) return null;
    return deserializeDataset(await readJson<SerializedDataset>(res));
  } catch {
    return null;
  }
}

export async function putDatasetRemote(rec: DatasetRecord): Promise<boolean> {
  try {
    const body = await serializeDataset(rec);
    const res = await fetch(`/api/store/datasets/${encodeURIComponent(rec.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: timeoutSignal(WRITE_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteDatasetRemote(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/store/datasets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      signal: timeoutSignal(READ_MS),
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export async function fetchRuns(datasetId?: string): Promise<RunRecord[] | null> {
  try {
    const qs = datasetId ? `?datasetId=${encodeURIComponent(datasetId)}` : '';
    const res = await fetch(`/api/store/runs${qs}`, { signal: timeoutSignal(READ_MS) });
    if (!res.ok) return null;
    const data = await readJson<unknown>(res);
    return Array.isArray(data) ? (data as RunRecord[]) : null;
  } catch {
    return null;
  }
}

export async function fetchRun(id: string): Promise<RunRecord | null> {
  try {
    const res = await fetch(`/api/store/runs/${encodeURIComponent(id)}`, {
      signal: timeoutSignal(READ_MS),
    });
    if (!res.ok) return null;
    return await readJson<RunRecord>(res);
  } catch {
    return null;
  }
}

export async function putRunRemote(run: RunRecord): Promise<boolean> {
  try {
    const res = await fetch(`/api/store/runs/${encodeURIComponent(run.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run),
      signal: timeoutSignal(WRITE_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteRunRemote(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/store/runs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      signal: timeoutSignal(READ_MS),
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}
