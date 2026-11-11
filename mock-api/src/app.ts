import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import Busboy from 'busboy';
import { parse } from 'csv-parse';
import { randomUUID } from 'node:crypto';
import {
  CAMPAIGN_STATUSES, CHANNELS,
  type ApiErrorBody, type Campaign, type CampaignStatus, type Channel, type CreateCampaignFields, type Paginated, type RowError,
} from '../../shared/contracts';
import { MAX_ROW_ERRORS, validateHeader, validateRow } from '../../shared/csvRules';
import { allCampaigns, createCampaign, getCampaign, getMetrics, retryFailures } from './simulation';
import { log } from './logger';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const idempotency = new Map<string, string>();

function sendError(res: Response, status: number, body: ApiErrorBody['error']) {
  res.status(status).json({ error: body } satisfies ApiErrorBody);
}

function chaos(req: Request, res: Response, next: NextFunction) {
  const on = req.query.chaos === '1' || process.env.CHAOS === '1';
  if (!on || req.method !== 'GET') return next();
  const r = Math.random();
  if (r < 0.1) return sendError(res, 500, { code: 'INTERNAL', message: 'Chaos: simulated server error' });
  if (r < 0.2) return void setTimeout(next, 3000);
  if (r < 0.25) return void res.json({ items: 'not-an-array', page: 'x' });
  next();
}

function correlation(req: Request, res: Response, next: NextFunction) {
  const id = (req.header('x-correlation-id') ?? randomUUID()).slice(0, 64);
  res.setHeader('x-correlation-id', id);
  res.locals.correlationId = id;
  const started = Date.now();
  res.on('finish', () => log.info('http.request', {
    correlationId: id, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started,
  }));
  next();
}

function validateFields(f: Partial<Record<keyof CreateCampaignFields, string>>): { fields?: CreateCampaignFields; error?: string } {
  const tenantId = (f.tenantId ?? '').trim();
  const name = (f.name ?? '').trim();
  const channel = (f.channel ?? '').trim() as Channel;
  const messageTemplate = (f.messageTemplate ?? '').trim();
  const scheduledRaw = (f.scheduledAt ?? '').trim();
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(tenantId)) return { error: 'tenantId must be 2–63 lowercase letters, digits or dashes' };
  if (!name || name.length > 120) return { error: 'name is required (max 120 characters)' };
  if (!CHANNELS.includes(channel)) return { error: 'channel must be EMAIL, SMS or PUSH' };
  if (!messageTemplate || messageTemplate.length > 2000) return { error: 'messageTemplate is required (max 2000 characters)' };
  let scheduledAt: string | null = null;
  if (scheduledRaw) {
    const ms = Date.parse(scheduledRaw);
    if (Number.isNaN(ms)) return { error: 'scheduledAt must be an ISO date-time' };
    if (ms < Date.now() - 60_000) return { error: 'scheduledAt must be in the future' };
    scheduledAt = new Date(ms).toISOString();
  }
  return { fields: { tenantId, name, channel, messageTemplate, scheduledAt } };
}

export function createApp() {
  const app = express();
  app.use(cors({ exposedHeaders: ['x-correlation-id', 'date'] }));
  app.use(correlation);
  app.use(chaos);

  app.get('/health', (_req, res) => { res.json({ ok: true }); });

  app.get('/tenants', (_req, res) => {
    res.json({ items: [...new Set(allCampaigns().map((c) => c.tenantId))].sort() });
  });

  app.get('/campaigns', (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const search = (q.search ?? '').trim().toLowerCase();
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 10));
    const channel = CHANNELS.includes(q.channel as Channel) ? (q.channel as Channel) : undefined;
    const statuses = (q.status ?? '').split(',').filter((s): s is CampaignStatus => CAMPAIGN_STATUSES.includes(s as CampaignStatus));

    let items = allCampaigns()
      .filter((c) => !q.tenantId || c.tenantId === q.tenantId)
      .filter((c) => !channel || c.channel === channel)
      .filter((c) => !statuses.length || statuses.includes(c.status))
      .filter((c) => !search || c.id.toLowerCase().includes(search) || c.name.toLowerCase().includes(search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = items.length;
    items = items.slice((page - 1) * pageSize, page * pageSize);
    res.json({ items, page, pageSize, total } satisfies Paginated<Campaign>);
  });

  app.get('/campaigns/:id', (req, res) => {
    const c = getCampaign(req.params.id);
    if (!c) return sendError(res, 404, { code: 'NOT_FOUND', message: `Campaign ${req.params.id} not found` });
    res.json(c);
  });

  app.get('/campaigns/:id/metrics', (req, res) => {
    const m = getMetrics(req.params.id);
    if (!m) return sendError(res, 404, { code: 'NOT_FOUND', message: `Campaign ${req.params.id} not found` });
    res.json(m);
  });

  app.post('/campaigns/:id/retry-failures', (req, res) => {
    const c = retryFailures(req.params.id);
    if (!c) return sendError(res, 404, { code: 'NOT_FOUND', message: `Campaign ${req.params.id} not found` });
    res.status(202).json(c);
  });

  app.post('/campaigns', (req, res) => {
    const key = req.header('idempotency-key');
    if (key && idempotency.has(key)) {
      const existing = getCampaign(idempotency.get(key)!);
      if (existing) return res.status(202).json(existing);
    }
    if (!req.is('multipart/form-data')) {
      return sendError(res, 400, { code: 'VALIDATION_ERROR', message: 'Expected multipart/form-data with a recipients CSV' });
    }

    const raw: Record<string, string> = {};
    let fileSeen = false;
    let finished = false;
    const fail = (status: number, body: ApiErrorBody['error']) => {
      if (finished) return;
      finished = true;
      req.unpipe(bb);
      req.resume();
      sendError(res, status, body);
    };

    const bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_UPLOAD_BYTES } });
    bb.on('field', (name, value) => { raw[name] = value; });
    bb.on('file', (_name, file) => {
      fileSeen = true;
      const { fields, error } = validateFields(raw);
      if (!fields) { file.resume(); return fail(400, { code: 'VALIDATION_ERROR', message: error! }); }

      const rowErrors: RowError[] = [];
      let errorCount = 0;
      let rows = 0;
      let headerError: string | null = null;
      const seen = new Set<string>();
      const parser = parse({
        bom: true,
        trim: true,
        skip_empty_lines: true,
        columns: (header: string[]) => { headerError = validateHeader(header); return header.map((h) => h.trim()); },
      });

      file.on('limit', () => fail(413, { code: 'PAYLOAD_TOO_LARGE', message: 'CSV is larger than 50 MB' }));
      parser.on('readable', () => {
        let rec: Record<string, string> | null;
        while ((rec = parser.read()) !== null) {
          if (headerError) continue;
          if (Object.values(rec).every((v) => !v)) continue;
          rows += 1;
          const errs = validateRow(rec, rows, fields.channel, seen);
          errorCount += errs.length;
          for (const e of errs) if (rowErrors.length < MAX_ROW_ERRORS) rowErrors.push(e);
        }
      });
      parser.on('error', (e) => fail(400, { code: 'VALIDATION_ERROR', message: `CSV could not be read: ${e.message}` }));
      parser.on('end', () => {
        if (finished) return;
        if (headerError) return fail(400, { code: 'VALIDATION_ERROR', message: headerError });
        if (rows === 0) return fail(400, { code: 'VALIDATION_ERROR', message: 'CSV has no recipient rows' });
        if (errorCount) {
          return fail(400, { code: 'VALIDATION_ERROR', message: `${errorCount} problem(s) found in ${rows} rows`, rowErrors });
        }
        const campaign = createCampaign(fields, rows);
        if (key) idempotency.set(key, campaign.id);
        finished = true;
        log.info('campaign.accepted', { correlationId: res.locals.correlationId, tenantId: campaign.tenantId, campaignId: campaign.id, totalRecipients: rows });
        res.status(202).json(campaign);
      });
      file.pipe(parser);
    });
    bb.on('close', () => {
      if (!fileSeen) fail(400, { code: 'VALIDATION_ERROR', message: 'recipients CSV file is required' });
    });
    bb.on('error', () => fail(400, { code: 'VALIDATION_ERROR', message: 'Malformed multipart body' }));
    req.pipe(bb);
  });

  app.use((_req, res) => sendError(res, 404, { code: 'NOT_FOUND', message: 'Route not found' }));
  return app;
}
