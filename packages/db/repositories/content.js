import { db, now } from '../index.js';
import { recordActivity } from './activity.js';
import { HttpError } from '@docksite/utils/http';

export const publicReleases = () =>
  db
    .prepare("SELECT * FROM releases WHERE status='published' ORDER BY published_at DESC,id DESC")
    .all();
export const publicRelease = (slug) =>
  db.prepare("SELECT * FROM releases WHERE slug=? AND status='published'").get(slug);
export const allReleases = () => db.prepare('SELECT * FROM releases ORDER BY id DESC').all();
export const releaseById = (id) => db.prepare('SELECT * FROM releases WHERE id=?').get(id);
export function saveRelease(data, actor, id = null) {
  return db.transaction(() => {
    const existing = id ? releaseById(id) : null;
    if (id && !existing) throw new HttpError(404, 'Release note not found.');
    const timestamp = now();
    const publishedAt =
      data.status === 'published'
        ? existing?.published_at || timestamp
        : existing?.published_at || null;
    const values = [
      data.slug,
      data.title,
      data.version || null,
      data.summary,
      data.body,
      data.status,
      publishedAt,
    ];
    if (id)
      db.prepare(
        'UPDATE releases SET slug=?,title=?,version=?,summary=?,body=?,status=?,published_at=?,updated_at=? WHERE id=?',
      ).run(...values, timestamp, id);
    else
      id = Number(
        db
          .prepare(
            'INSERT INTO releases (slug,title,version,summary,body,status,published_at,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
          )
          .run(...values, actor.id, timestamp, timestamp).lastInsertRowid,
      );
    recordActivity(actor.id, existing ? 'release.update' : 'release.create', 'release', id, {
      status: data.status,
    });
    return id;
  })();
}
export function removeRelease(id, actor) {
  db.transaction(() => {
    if (!db.prepare('DELETE FROM releases WHERE id=?').run(id).changes)
      throw new HttpError(404, 'Release note not found.');
    recordActivity(actor.id, 'release.delete', 'release', id);
  })();
}
export function insertReport(data) {
  return Number(
    db
      .prepare(
        'INSERT INTO abuse_reports (resource_url,reason,description,reporter_email,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      )
      .run(
        data.resource_url,
        data.reason,
        data.description,
        data.reporter_email || null,
        now(),
        now(),
      ).lastInsertRowid,
  );
}
export const reportsList = () =>
  db.prepare('SELECT * FROM abuse_reports ORDER BY id DESC LIMIT 200').all();
export const reportById = (id) => db.prepare('SELECT * FROM abuse_reports WHERE id=?').get(id);
export function reviewReport(id, data, actor) {
  db.transaction(() => {
    if (
      !db
        .prepare(
          'UPDATE abuse_reports SET status=?,reviewed_by=?,review_note=?,updated_at=? WHERE id=?',
        )
        .run(data.status, actor.id, data.review_note, now(), id).changes
    )
      throw new HttpError(404, 'Report not found.');
    recordActivity(actor.id, 'report.review', 'report', id, { status: data.status });
  })();
}
