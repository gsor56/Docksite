import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from '@docksite/config';
import { db, now, requireSchema } from '@docksite/db';

try {
  requireSchema();
  const expired = db
    .prepare('SELECT id, stored_path FROM media WHERE expires_at IS NOT NULL AND expires_at <= ?')
    .all(now());
  for (const media of expired) {
    await unlink(resolve(config.UPLOAD_DIR, media.stored_path)).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    db.prepare('DELETE FROM media WHERE id = ?').run(media.id);
  }
  const cutoff = new Date(Date.now() - config.ANALYTICS_RETENTION_DAYS * 86400000).toISOString();
  db.transaction(() => {
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    db.prepare('DELETE FROM analytics_events WHERE created_at < ?').run(cutoff);
    db.prepare('DELETE FROM short_link_clicks WHERE created_at < ?').run(cutoff);
  })();
  console.log(`Cleanup complete. Removed ${expired.length} expired files.`);
} finally {
  db.close();
}
