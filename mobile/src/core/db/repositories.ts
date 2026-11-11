import type { Campaign } from '@shared/contracts';
import { getDb } from './database';

export interface CampaignCache {
  replaceActive(items: Campaign[], syncedAt: number): Promise<void>;
  loadAll(): Promise<Campaign[]>;
  upsert(c: Campaign, syncedAt: number): Promise<void>;
  get(id: string): Promise<Campaign | null>;
}

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface AlertStateStore {
  alertedIds(): Promise<Set<string>>;
  setAlerted(campaignId: string, alerted: boolean, at: number): Promise<void>;
}

export const sqliteCampaignCache: CampaignCache = {
  async replaceActive(items, syncedAt) {
    const db = await getDb();
    await db.transaction(async (tx) => {
      // Inactive campaigns stay cached so the detail screen works offline.
      for (const c of items) {
        await tx.execute(
          'INSERT OR REPLACE INTO campaigns (id, tenant_id, status, json, synced_at) VALUES (?, ?, ?, ?, ?)',
          [c.id, c.tenantId, c.status, JSON.stringify(c), syncedAt],
        );
      }
      const ids = items.map((c) => c.id);
      const placeholders = ids.map(() => '?').join(',') || "''";
      await tx.execute(
        `UPDATE campaigns SET status = 'INACTIVE' WHERE status IN ('RUNNING','SCHEDULED') AND id NOT IN (${placeholders})`,
        ids,
      );
    });
  },
  async loadAll() {
    const db = await getDb();
    const res = await db.execute("SELECT json FROM campaigns WHERE status IN ('RUNNING','SCHEDULED')");
    return res.rows.map((r) => JSON.parse(String(r.json)) as Campaign);
  },
  async upsert(c, syncedAt) {
    const db = await getDb();
    await db.execute(
      'INSERT OR REPLACE INTO campaigns (id, tenant_id, status, json, synced_at) VALUES (?, ?, ?, ?, ?)',
      [c.id, c.tenantId, c.status, JSON.stringify(c), syncedAt],
    );
  },
  async get(id) {
    const db = await getDb();
    const res = await db.execute('SELECT json FROM campaigns WHERE id = ?', [id]);
    return res.rows[0] ? (JSON.parse(String(res.rows[0].json)) as Campaign) : null;
  },
};

export const sqliteKv: KeyValueStore = {
  async get(key) {
    const db = await getDb();
    const res = await db.execute('SELECT value FROM kv WHERE key = ?', [key]);
    return res.rows[0] ? String(res.rows[0].value) : null;
  },
  async set(key, value) {
    const db = await getDb();
    await db.execute('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value]);
  },
};

export const sqliteAlertState: AlertStateStore = {
  async alertedIds() {
    const db = await getDb();
    const res = await db.execute('SELECT campaign_id FROM alert_state WHERE alerted = 1');
    return new Set(res.rows.map((r) => String(r.campaign_id)));
  },
  async setAlerted(campaignId, alerted, at) {
    const db = await getDb();
    await db.execute('INSERT OR REPLACE INTO alert_state (campaign_id, alerted, updated_at) VALUES (?, ?, ?)', [campaignId, alerted ? 1 : 0, at]);
  },
};

export function memoryCampaignCache(): CampaignCache {
  const m = new Map<string, Campaign>();
  return {
    async replaceActive(items) {
      for (const [id, c] of m) if (!items.find((i) => i.id === id) && (c.status === 'RUNNING' || c.status === 'SCHEDULED')) m.delete(id);
      items.forEach((c) => m.set(c.id, c));
    },
    async loadAll() { return [...m.values()].filter((c) => c.status === 'RUNNING' || c.status === 'SCHEDULED'); },
    async upsert(c) { m.set(c.id, c); },
    async get(id) { return m.get(id) ?? null; },
  };
}

export function memoryKv(): KeyValueStore {
  const m = new Map<string, string>();
  return { async get(k) { return m.get(k) ?? null; }, async set(k, v) { m.set(k, v); } };
}

export function memoryAlertState(): AlertStateStore {
  const s = new Set<string>();
  return {
    async alertedIds() { return new Set(s); },
    async setAlerted(id, alerted) { if (alerted) s.add(id); else s.delete(id); },
  };
}
