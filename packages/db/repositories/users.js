import { db, now } from '../index.js';
import { recordActivity } from './activity.js';

export const findUser = (id) =>
  db
    .prepare(
      'SELECT id, username, email, role, is_active, created_at, updated_at, developer_approved_at FROM users WHERE id = ?',
    )
    .get(id);
export const loginUser = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);
export const ownerExists = () =>
  Boolean(db.prepare("SELECT id FROM users WHERE role = 'owner'").get());
export function insertUser({ username, email, passwordHash, role = 'user' }) {
  const result = db
    .prepare(
      'INSERT INTO users (username, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(username, email, passwordHash, role, now(), now());
  return findUser(Number(result.lastInsertRowid));
}
export const allUsers = () =>
  db
    .prepare('SELECT id, username, email, role, is_active, created_at FROM users ORDER BY id DESC')
    .all();
export function grantDeveloperAccess(id) {
  const timestamp = now();
  db.prepare(
    "UPDATE users SET role='contributor', developer_approved_at=COALESCE(developer_approved_at,?), updated_at=? WHERE id=? AND role IN ('user','contributor')",
  ).run(timestamp, timestamp, id);
}
export function updateUser(actor, id, role, active) {
  return db.transaction(() => {
    const user = findUser(id);
    if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
    if (
      actor.role !== 'owner' &&
      (['owner', 'admin'].includes(user.role) || ['owner', 'admin'].includes(role))
    )
      throw Object.assign(new Error('Only the owner can manage administrators.'), { status: 403 });
    if (
      user.role === 'owner' &&
      (role !== 'owner' || !active) &&
      db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'owner' AND is_active = 1").get()
        .count <= 1
    )
      throw Object.assign(new Error('The last active owner must remain enabled.'), { status: 409 });
    const timestamp = now();
    const approval =
      role === 'contributor'
        ? user.developer_approved_at || (actor.role === 'owner' ? timestamp : null)
        : null;
    db.prepare(
      'UPDATE users SET role=?, is_active=?, updated_at=?, developer_approved_at=? WHERE id=?',
    ).run(role, active ? 1 : 0, timestamp, approval, id);
    recordActivity(actor.id, 'user.update', 'user', id, { role, active });
  })();
}
