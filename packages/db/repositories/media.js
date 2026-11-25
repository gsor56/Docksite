import { db } from '../index.js';
export const mediaList = (user) =>
  db
    .prepare(
      `SELECT m.*, u.username FROM media m JOIN users u ON u.id = m.owner_id ${user.role === 'contributor' ? 'WHERE m.owner_id = ?' : ''} ORDER BY m.id DESC`,
    )
    .all(...(user.role === 'contributor' ? [user.id] : []));
export const findMedia = (id) => db.prepare('SELECT * FROM media WHERE id = ?').get(id);
