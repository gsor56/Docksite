import { db, now } from '../index.js';

export function recordEvent(toolId, userId, event, metadata = {}) {
  db.prepare(
    'INSERT INTO analytics_events (tool_id, user_id, event, metadata, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(toolId, userId, event, JSON.stringify(metadata), now());
}
export const events = () =>
  db
    .prepare(
      'SELECT a.*, t.name AS tool_name FROM analytics_events a LEFT JOIN tools t ON t.id = a.tool_id ORDER BY a.id DESC LIMIT 200',
    )
    .all();
export const eventTotals = () =>
  db
    .prepare('SELECT event, COUNT(*) AS total FROM analytics_events GROUP BY event ORDER BY event')
    .all();
