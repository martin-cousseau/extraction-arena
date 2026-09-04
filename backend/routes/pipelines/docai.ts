import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { createRequestLogger, formatBytes } from '../../lib/log.js';
import {
  creditsToUsd,
  resolveLlamaExtractTier,
  runLlamaExtract,
  type LlamaExtractConfig,
} from '../../lib/llamaExtract.js';

const router = Router();
const MAX_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are accepted.'));
      return;
    }
    cb(null, true);
  },
});

function resolveApiKey(req: Request): string | null {
  const header = req.header('x-llama-api-key')?.trim();
  if (header) return header;
  const env = process.env.LLAMA_CLOUD_API_KEY?.trim();
  return env || null;
}

router.get('/pipelines/docai', (_req, res) => {
  res.json({
    pipeline: 'docai',
    configured: Boolean(process.env.LLAMA_CLOUD_API_KEY?.trim()),
    projectConfigured: Boolean(process.env.LLAMA_CLOUD_PROJECT_ID?.trim()),
  });
});

router.post('/pipelines/docai', upload.single('pdf'), async (req: Request, res: Response) => {
  const log = createRequestLogger('docai');
  const apiKey = resolveApiKey(req);
  if (!apiKey) {
    log.warn('rejecting DocAI run with no Llama Cloud key');
    return res.status(503).json({
      error: 'Llama Cloud API key is not configured. Set LLAMA_CLOUD_API_KEY on the backend or paste a session key in Settings.',
    });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded (field name must be "pdf").' });
  }

  let dataSchema: unknown = {};
  let extra: Partial<LlamaExtractConfig> = {};
  try {
    if (typeof req.body?.data_schema === 'string' && req.body.data_schema.trim()) {
      dataSchema = JSON.parse(req.body.data_schema);
    }
    if (typeof req.body?.configuration === 'string' && req.body.configuration.trim()) {
      extra = JSON.parse(req.body.configuration) as Partial<LlamaExtractConfig>;
    }
  } catch {
    return res.status(400).json({ error: 'data_schema and configuration must be JSON strings.' });
  }

  log.log('starting LlamaExtract job', {
    pdfName: req.file.originalname,
    uploadBytes: formatBytes(req.file.size),
    tier: resolveLlamaExtractTier(extra.tier),
  });

  const controller = new AbortController();
  const onClose = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on('close', onClose);

  try {
    const outcome = await runLlamaExtract({
      apiKey,
      projectId: process.env.LLAMA_CLOUD_PROJECT_ID?.trim() || undefined,
      filename: req.file.originalname || 'document.pdf',
      pdf: req.file.buffer,
      configuration: {
        data_schema: dataSchema,
        tier: resolveLlamaExtractTier(extra.tier),
        extraction_target: extra.extraction_target ?? 'per_doc',
        parse_tier: extra.parse_tier ?? 'agentic',
        cite_sources: extra.cite_sources ?? true,
        confidence_scores: extra.confidence_scores ?? true,
      },
      signal: controller.signal,
    });

    if (outcome.status !== 'COMPLETED') {
      log.warn('LlamaExtract job did not complete', {
        jobId: outcome.jobId,
        status: outcome.status,
        error: outcome.errorMessage,
      });
      return res.status(502).json({
        error: outcome.errorMessage ?? `Extract job ${outcome.jobId} ended in ${outcome.status}`,
        jobId: outcome.jobId,
        status: outcome.status,
      });
    }

    log.log('LlamaExtract job completed', {
      jobId: outcome.jobId,
      elapsedMs: outcome.elapsedMs,
      credits: outcome.usage.credits,
    });

    return res.json({
      jobId: outcome.jobId,
      status: outcome.status,
      extractResult: outcome.extractResult,
      extractMetadata: outcome.extractMetadata,
      configuration: outcome.configuration,
      usage: outcome.usage,
      costUsd: creditsToUsd(outcome.usage.credits),
      elapsedMs: outcome.elapsedMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === 'AbortError') {
      log.warn('client disconnected during LlamaExtract');
      return;
    }
    log.error('LlamaExtract failed', { message });
    return res.status(502).json({ error: `LlamaExtract failed: ${message}` });
  } finally {
    res.off('close', onClose);
  }
});

export default router;
