import { db, now } from '../index.js';

export function recordActivity(actorId, action, entityType, entityId = null, metadata = {}) {
  db.prepare(
    'INSERT INTO activity_log (actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(actorId, action, entityType, entityId, JSON.stringify(metadata), now());
}
export const activityList = () =>
  db
    .prepare(
      'SELECT a.*, u.username FROM activity_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 200',
    )
    .all();
