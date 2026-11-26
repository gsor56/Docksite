import Database from 'better-sqlite3';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { config } from '@docksite/config';

mkdirSync(dirname(config.DATABASE_PATH), { recursive: true });
export const db = new Database(config.DATABASE_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

export const now = () => new Date().toISOString();
export function migrate() {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)',
  );
  const directory = new URL('./migrations/', import.meta.url);
  const applied = [];
  for (const version of readdirSync(directory)
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(new URL(version, directory), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const existing = db
      .prepare('SELECT checksum FROM schema_migrations WHERE version = ?')
      .get(version);
    if (existing && existing.checksum !== checksum)
      throw new Error(`Changed migration: ${version}`);
    if (existing) continue;
    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        db.exec(sql);
        if (db.pragma('foreign_key_check').length)
          throw new Error('Migration violates foreign keys.');
        db.prepare(
          'INSERT INTO schema_migrations (version, checksum, applied_at) VALUES (?, ?, ?)',
        ).run(version, checksum, now());
      })();
    } finally {
      db.pragma('foreign_keys = ON');
    }
    applied.push(version);
  }
  db.prepare(
    'INSERT OR IGNORE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)',
  ).run('platform_name', config.INITIAL_PLATFORM_NAME, now(), now());
  return applied;
}

export function requireSchema() {
  if (
    !db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'releases'").get() ||
    !db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'email_outbox'").get()
  ) {
    throw new Error('Database is not migrated. Run npm run migrate.');
  }
}
