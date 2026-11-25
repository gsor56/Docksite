import session from 'express-session';
import { db, now } from '@docksite/db';
import { config } from '@docksite/config';

export class SQLiteSessionStore extends session.Store {
  constructor(app) {
    super();
    this.app = app;
  }
  get(sid, callback) {
    try {
      const row = db
        .prepare('SELECT data FROM sessions WHERE app = ? AND sid = ? AND expires_at > ?')
        .get(this.app, sid, Date.now());
      callback(null, row ? JSON.parse(row.data) : null);
    } catch (error) {
      callback(error);
    }
  }
  set(sid, data, callback = () => {}) {
    try {
      const expiration = data.cookie?.expires
        ? new Date(data.cookie.expires).getTime()
        : Date.now() + config.SESSION_TTL_SECONDS * 1000;
      db.prepare(
        'INSERT INTO sessions (app,sid,data,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(app,sid) DO UPDATE SET data=excluded.data, expires_at=excluded.expires_at, updated_at=excluded.updated_at',
      ).run(this.app, sid, JSON.stringify(data), expiration, now(), now());
      callback();
    } catch (error) {
      callback(error);
    }
  }
  destroy(sid, callback = () => {}) {
    try {
      db.prepare('DELETE FROM sessions WHERE app = ? AND sid = ?').run(this.app, sid);
      callback();
    } catch (error) {
      callback(error);
    }
  }
  touch(sid, data, callback = () => {}) {
    try {
      db.prepare(
        'UPDATE sessions SET expires_at = ?, updated_at = ? WHERE app = ? AND sid = ?',
      ).run(new Date(data.cookie.expires).getTime(), now(), this.app, sid);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}
