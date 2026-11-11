import { open, type DB } from '@op-engineering/op-sqlite';
import { logger } from '../logger';

let db: DB | null = null;

const MIGRATIONS: string[] = [
  // v1
  `CREATE TABLE IF NOT EXISTS campaigns (
     id TEXT PRIMARY KEY NOT NULL,
     tenant_id TEXT NOT NULL,
     status TEXT NOT NULL,
     json TEXT NOT NULL,
     synced_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
   CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS alert_state (
     campaign_id TEXT PRIMARY KEY NOT NULL,
     alerted INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );`,
];

export async function getDb(): Promise<DB> {
  if (db) return db;
  const d = open({ name: 'campaign-monitor.db' });
  const res = await d.execute('PRAGMA user_version');
  const version = Number(res.rows[0]?.user_version ?? 0);
  for (let v = version; v < MIGRATIONS.length; v += 1) {
    for (const stmt of MIGRATIONS[v].split(';').map((s) => s.trim()).filter(Boolean)) {
      await d.execute(stmt);
    }
    await d.execute(`PRAGMA user_version = ${v + 1}`);
    logger.info('db.migrated', { version: v + 1 });
  }
  db = d;
  return d;
}
