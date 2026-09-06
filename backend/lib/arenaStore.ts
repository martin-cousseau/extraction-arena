import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface DatasetMetaPayload {
  id: string;
  name: string;
  pdfName: string;
  dpi: number;
  pageCount: number;
  fieldCount: number;
  createdAt: number;
  updatedAt?: number;
}

const ID_RE = /^[\w.-]{1,128}$/;

export function arenaDataDir(): string {
  return process.env.ARENA_DATA_DIR?.trim() || path.join(process.cwd(), 'data', 'arena');
}

function datasetsDir(): string {
  return path.join(arenaDataDir(), 'datasets');
}

function runsDir(): string {
  return path.join(arenaDataDir(), 'runs');
}

export function assertSafeId(id: string): string {
  if (!ID_RE.test(id)) {
    const err = new Error('Invalid record id.');
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  return id;
}

async function ensureDirs(): Promise<void> {
  await mkdir(datasetsDir(), { recursive: true });
  await mkdir(runsDir(), { recursive: true });
}

function datasetPath(id: string): string {
  return path.join(datasetsDir(), `${assertSafeId(id)}.json`);
}

function runPath(id: string): string {
  return path.join(runsDir(), `${assertSafeId(id)}.json`);
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await ensureDirs();
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value), 'utf8');
  await rename(tmp, file);
}

async function readJsonFile(file: string): Promise<unknown | null> {
  try {
    const raw = await readFile(file, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
    if (code === 'ENOENT') return null;
    throw err;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function asMeta(record: Record<string, unknown>): DatasetMetaPayload | null {
  if (typeof record.id !== 'string' || !record.id) return null;
  return {
    id: record.id,
    name: typeof record.name === 'string' ? record.name : 'Untitled dataset',
    pdfName: typeof record.pdfName === 'string' ? record.pdfName : '',
    dpi: typeof record.dpi === 'number' ? record.dpi : 300,
    pageCount: typeof record.pageCount === 'number' ? record.pageCount : 0,
    fieldCount: typeof record.fieldCount === 'number' ? record.fieldCount : 0,
    createdAt: typeof record.createdAt === 'number' ? record.createdAt : 0,
    ...(typeof record.updatedAt === 'number' ? { updatedAt: record.updatedAt } : {}),
  };
}

export async function listDatasetMetas(): Promise<DatasetMetaPayload[]> {
  await ensureDirs();
  const names = await readdir(datasetsDir());
  const metas: DatasetMetaPayload[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const parsed = await readJsonFile(path.join(datasetsDir(), name));
    if (!isPlainObject(parsed)) continue;
    const meta = asMeta(parsed);
    if (meta) metas.push(meta);
  }
  return metas.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getDataset(id: string): Promise<Record<string, unknown> | null> {
  const parsed = await readJsonFile(datasetPath(id));
  return isPlainObject(parsed) ? parsed : null;
}

export async function putDataset(id: string, body: unknown): Promise<Record<string, unknown>> {
  if (!isPlainObject(body)) {
    const err = new Error('Dataset body must be a JSON object.');
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const record = { ...body, id: assertSafeId(id) };
  await writeJsonAtomic(datasetPath(id), record);
  return record;
}

export async function deleteDataset(id: string): Promise<boolean> {
  const file = datasetPath(id);
  try {
    await rm(file);
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
    if (code === 'ENOENT') return false;
    throw err;
  }
  const runs = await listRuns(id);
  await Promise.all(runs.map((run) => (typeof run.id === 'string' ? deleteRun(run.id) : Promise.resolve(false))));
  return true;
}

export async function listRuns(datasetId?: string): Promise<Record<string, unknown>[]> {
  await ensureDirs();
  const names = await readdir(runsDir());
  const runs: Record<string, unknown>[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const parsed = await readJsonFile(path.join(runsDir(), name));
    if (!isPlainObject(parsed)) continue;
    if (datasetId && parsed.datasetId !== datasetId) continue;
    runs.push(parsed);
  }
  return runs.sort((a, b) => {
    const aTime = typeof a.startedAt === 'number' ? a.startedAt : 0;
    const bTime = typeof b.startedAt === 'number' ? b.startedAt : 0;
    return bTime - aTime;
  });
}

export async function getRun(id: string): Promise<Record<string, unknown> | null> {
  const parsed = await readJsonFile(runPath(id));
  return isPlainObject(parsed) ? parsed : null;
}

export async function putRun(id: string, body: unknown): Promise<Record<string, unknown>> {
  if (!isPlainObject(body)) {
    const err = new Error('Run body must be a JSON object.');
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const record = { ...body, id: assertSafeId(id) };
  await writeJsonAtomic(runPath(id), record);
  return record;
}

export async function deleteRun(id: string): Promise<boolean> {
  try {
    await rm(runPath(id));
    return true;
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
    if (code === 'ENOENT') return false;
    throw err;
  }
}
