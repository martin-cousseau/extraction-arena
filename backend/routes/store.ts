import { Router } from 'express';
import {
  deleteDataset,
  deleteRun,
  getDataset,
  getRun,
  listDatasetMetas,
  listRuns,
  putDataset,
  putRun,
} from '../lib/arenaStore.js';

const router = Router();

router.get('/store/datasets', async (_req, res, next) => {
  try {
    res.json(await listDatasetMetas());
  } catch (err) {
    next(err);
  }
});

router.get('/store/datasets/:id', async (req, res, next) => {
  try {
    const record = await getDataset(String(req.params.id));
    if (!record) return res.status(404).json({ error: 'Dataset not found.' });
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.put('/store/datasets/:id', async (req, res, next) => {
  try {
    res.json(await putDataset(String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
});

router.delete('/store/datasets/:id', async (req, res, next) => {
  try {
    const ok = await deleteDataset(String(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Dataset not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/store/runs', async (req, res, next) => {
  try {
    const datasetId = typeof req.query.datasetId === 'string' ? req.query.datasetId : undefined;
    res.json(await listRuns(datasetId));
  } catch (err) {
    next(err);
  }
});

router.get('/store/runs/:id', async (req, res, next) => {
  try {
    const record = await getRun(String(req.params.id));
    if (!record) return res.status(404).json({ error: 'Run not found.' });
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.put('/store/runs/:id', async (req, res, next) => {
  try {
    res.json(await putRun(String(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
});

router.delete('/store/runs/:id', async (req, res, next) => {
  try {
    const ok = await deleteRun(String(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Run not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
