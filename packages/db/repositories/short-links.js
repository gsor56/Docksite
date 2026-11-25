import { db, now } from '../index.js';
import { recordEvent } from './analytics.js';

export const ownLinks = (userId) =>
  db
    .prepare('SELECT * FROM short_links WHERE user_id = ? AND deleted_at IS NULL ORDER BY id DESC')
    .all(userId);
export const ownLink = (id, userId) =>
  db
    .prepare('SELECT * FROM short_links WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
    .get(id, userId);
export const publicLink = (code, toolId) =>
  db
    .prepare('SELECT * FROM short_links WHERE code = ? AND tool_id = ? AND deleted_at IS NULL')
    .get(code, toolId);
export const clicks = (id) =>
  db
    .prepare(
      'SELECT created_at, referrer FROM short_link_clicks WHERE short_link_id = ? ORDER BY id DESC LIMIT 100',
    )
    .all(id);
export function insertLink(data, userId, toolId) {
  return db.transaction(() => {
    const id = Number(
      db
        .prepare(
          'INSERT INTO short_links (tool_id,user_id,code,destination_url,password_hash,expires_at,click_limit,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        )
        .run(
          toolId,
          userId,
          data.code,
          data.destination_url,
          data.password_hash,
          data.expires_at,
          data.click_limit,
          data.is_active ? 1 : 0,
          now(),
          now(),
        ).lastInsertRowid,
    );
    recordEvent(toolId, userId, 'use', { action: 'create', short_link_id: id });
    return id;
  })();
}
export function consumeClick(link, userId, metadata) {
  return db.transaction(() => {
    const timestamp = now();
    const result = db
      .prepare(
        'UPDATE short_links SET click_count = click_count + 1 WHERE id = ? AND deleted_at IS NULL AND is_active = 1 AND password_hash IS ? AND (expires_at IS NULL OR expires_at > ?) AND (click_limit IS NULL OR click_count < click_limit)',
      )
      .run(link.id, link.password_hash, timestamp);
    if (!result.changes) return null;
    const current = db.prepare('SELECT * FROM short_links WHERE id = ?').get(link.id);
    db.prepare(
      'INSERT INTO short_link_clicks (short_link_id,user_id,ip_hash,user_agent,referrer,created_at) VALUES (?,?,?,?,?,?)',
    ).run(link.id, userId, metadata.ipHash, metadata.userAgent, metadata.referrer, timestamp);
    recordEvent(current.tool_id, userId, 'use', { action: 'click', short_link_id: current.id });
    return current.destination_url;
  })();
}
