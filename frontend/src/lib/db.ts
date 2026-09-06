import type { DatasetMeta, DatasetRecord } from './dataset';
import { alignDatasetGolden, migrateLegacyDataset } from './canonical/ingest';
import type { RunRecord } from './harness/types';
import {
  arenaStoreAvailable,
  deleteDatasetRemote,
  deleteRunRemote,
  fetchDataset,
  fetchDatasetMetas,
  fetchRun,
  fetchRuns,
  isNewer,
  putDatasetRemote,
  putRunRemote,
} from './arenaStore';

/**
 * Persistence for datasets and runs.
 *
 * IndexedDB is the per-browser cache. When the local backend is up, records
 * also live on disk (`backend/data/arena`) so Safari, Brave, and Chrome on
 * this machine share the same datasets and runs. Scoring still stays in the
 * client.
 */

const DB_NAME = 'extraction-arena';
const DB_VERSION = 3;
const META_STORE = 'datasets-meta';
const FULL_STORE = 'datasets-full';
const RUNS_STORE = 'runs';

let syncGate: Promise<boolean> | null = null;

function isMigrated(rec: unknown): boolean {
  return !!rec && typeof rec === 'object' && 'canonical' in (rec as object);
}

function stampDataset(rec: DatasetRecord): DatasetRecord {
  return { ...rec, updatedAt: Date.now() };
}

function stampRun(run: RunRecord): RunRecord {
  return { ...run, updatedAt: Date.now() };
}

function toMeta(rec: DatasetRecord): DatasetMeta {
  const { id, name, pdfName, dpi, pageCount, fieldCount, createdAt, updatedAt } = rec;
  return { id, name, pdfName, dpi, pageCount, fieldCount, createdAt, updatedAt };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FULL_STORE)) {
        db.createObjectStore(FULL_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(RUNS_STORE)) {
        const runs = db.createObjectStore(RUNS_STORE, { keyPath: 'id' });
        runs.createIndex('datasetId', 'datasetId', { unique: false });
        runs.createIndex('startedAt', 'startedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = fn(transaction.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      })
  );
}

async function idbSaveDataset(rec: DatasetRecord): Promise<void> {
  await tx(META_STORE, 'readwrite', (s) => s.put(toMeta(rec)));
  await tx(FULL_STORE, 'readwrite', (s) => s.put(rec));
}

async function idbLoadDatasetRaw(id: string): Promise<DatasetRecord | undefined> {
  return tx<DatasetRecord | undefined>(FULL_STORE, 'readonly', (s) => s.get(id));
}

async function idbListMetas(): Promise<DatasetMeta[]> {
  const all = await tx<DatasetMeta[]>(META_STORE, 'readonly', (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

async function idbDeleteDataset(id: string): Promise<void> {
  await tx(META_STORE, 'readwrite', (s) => s.delete(id));
  await tx(FULL_STORE, 'readwrite', (s) => s.delete(id));
}

async function idbSaveRun(run: RunRecord): Promise<void> {
  await tx(RUNS_STORE, 'readwrite', (s) => s.put(run));
}

async function idbLoadRun(id: string): Promise<RunRecord | undefined> {
  return tx<RunRecord | undefined>(RUNS_STORE, 'readonly', (s) => s.get(id));
}

async function idbDeleteRun(id: string): Promise<void> {
  await tx(RUNS_STORE, 'readwrite', (s) => s.delete(id));
}

async function idbListRuns(datasetId?: string): Promise<RunRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RUNS_STORE, 'readonly');
    const store = transaction.objectStore(RUNS_STORE);
    const request = datasetId
      ? store.index('datasetId').getAll(datasetId)
      : store.getAll();
    request.onsuccess = () => {
      const rows = (request.result as RunRecord[]).sort((a, b) => b.startedAt - a.startedAt);
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function syncWithServer(): Promise<boolean> {
  if (!(await arenaStoreAvailable())) return false;

  const remoteMetas = await fetchDatasetMetas();
  if (!remoteMetas) return false;
  const localMetas = await idbListMetas();
  const remoteById = new Map(remoteMetas.map((m) => [m.id, m]));
  const localById = new Map(localMetas.map((m) => [m.id, m]));

  for (const local of localMetas) {
    const remote = remoteById.get(local.id);
    if (!remote || isNewer(local, remote)) {
      const full = await idbLoadDatasetRaw(local.id);
      if (full) await putDatasetRemote(full);
    }
  }
  for (const remote of remoteMetas) {
    const local = localById.get(remote.id);
    if (!local || isNewer(remote, local)) {
      const full = await fetchDataset(remote.id);
      if (full) await idbSaveDataset(full);
    }
  }

  const remoteRuns = await fetchRuns();
  if (!remoteRuns) return true;
  const localRuns = await idbListRuns();
  const remoteRunById = new Map(remoteRuns.map((r) => [r.id, r]));
  const localRunById = new Map(localRuns.map((r) => [r.id, r]));

  for (const local of localRuns) {
    const remote = remoteRunById.get(local.id);
    if (!remote || isNewer(local, remote)) {
      await putRunRemote(local);
    }
  }
  for (const remote of remoteRuns) {
    const local = localRunById.get(remote.id);
    if (!local || isNewer(remote, local)) {
      await idbSaveRun(remote);
    }
  }

  return true;
}

function ensureSynced(): Promise<boolean> {
  if (!syncGate) {
    syncGate = syncWithServer().catch(() => {
      syncGate = null;
      return false;
    });
  }
  return syncGate;
}

/** Reset the sync gate (tests). */
export function resetArenaSync(): void {
  syncGate = null;
}

async function ensureMigrated(rec: DatasetRecord | undefined): Promise<DatasetRecord | undefined> {
  if (!rec) return rec;
  let next = rec;
  let dirty = false;
  if (!isMigrated(rec)) {
    next = migrateLegacyDataset(rec as unknown as Parameters<typeof migrateLegacyDataset>[0]);
    dirty = true;
  }
  const aligned = alignDatasetGolden(next);
  if (aligned !== next) {
    next = aligned;
    dirty = true;
  }
  if (dirty) return saveDataset(next);
  return next;
}

export async function saveDataset(rec: DatasetRecord): Promise<DatasetRecord> {
  const stamped = stampDataset(rec);
  await idbSaveDataset(stamped);
  await putDatasetRemote(stamped);
  return stamped;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Recursively merge a partial patch into a base record. Plain objects are
 * merged key-by-key; arrays and scalars are replaced wholesale (matching the
 * golden value semantics: string[] / Record<string,string> are atomic units).
 */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(patch)) {
    const next = (patch as Record<string, unknown>)[key];
    out[key] = key in out ? deepMerge(out[key], next) : next;
  }
  return out as T;
}

export async function updateDataset(
  id: string,
  patch: Partial<DatasetRecord>
): Promise<DatasetRecord> {
  const existing = await loadDataset(id);
  if (!existing) throw new Error(`Dataset ${id} not found`);
  const merged = deepMerge(existing, patch);
  return saveDataset(merged);
}

export async function listDatasets(): Promise<DatasetMeta[]> {
  await ensureSynced();
  const remote = await fetchDatasetMetas();
  if (remote) return remote.sort((a, b) => b.createdAt - a.createdAt);
  return idbListMetas();
}

export async function loadDataset(id: string): Promise<DatasetRecord | undefined> {
  await ensureSynced();
  const remote = await fetchDataset(id);
  if (remote) {
    await idbSaveDataset(remote);
    return ensureMigrated(remote);
  }
  return ensureMigrated(await idbLoadDatasetRaw(id));
}

export async function deleteDataset(id: string): Promise<void> {
  const runs = await listRuns(id);
  await Promise.all(runs.map((run) => deleteRun(run.id)));
  await idbDeleteDataset(id);
  await deleteDatasetRemote(id);
}

export async function saveRun(run: RunRecord): Promise<RunRecord> {
  const stamped = stampRun(run);
  await idbSaveRun(stamped);
  await putRunRemote(stamped);
  return stamped;
}

export async function loadRun(id: string): Promise<RunRecord | undefined> {
  await ensureSynced();
  const remote = await fetchRun(id);
  if (remote) {
    await idbSaveRun(remote);
    return remote;
  }
  return idbLoadRun(id);
}

export async function deleteRun(id: string): Promise<void> {
  await idbDeleteRun(id);
  await deleteRunRemote(id);
}

export async function listRuns(datasetId?: string): Promise<RunRecord[]> {
  await ensureSynced();
  const remote = await fetchRuns(datasetId);
  if (remote) return remote.sort((a, b) => b.startedAt - a.startedAt);
  return idbListRuns(datasetId);
}
