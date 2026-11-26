import { db, now } from '../index.js';
import { toolUrl } from '@docksite/config/urls';
import { recordActivity } from './activity.js';
import { grantDeveloperAccess } from './users.js';
import { assertExternalProject } from '@docksite/utils/project-urls';
import { HttpError } from '@docksite/utils/http';

function serialize(row, includeApproval = false) {
  if (!row) return null;
  const tagRows = db
    .prepare(
      'SELECT tags.id, tags.slug, tags.name FROM tags JOIN tool_tags ON tool_tags.tag_id = tags.id WHERE tool_tags.tool_id = ? ORDER BY tags.name',
    )
    .all(row.id);
  const category = row.category_id
    ? db
        .prepare('SELECT id, slug, name, description FROM categories WHERE id = ?')
        .get(row.category_id)
    : null;
  const tool = {
    ...row,
    category,
    tags: tagRows,
    featured: Boolean(row.featured),
    url: toolUrl(row),
  };
  if (!includeApproval) delete tool.approved_url;
  return tool;
}
export const findTool = (slug, publishedOnly = true) =>
  serialize(
    db
      .prepare(
        `SELECT * FROM tools WHERE slug = ? ${publishedOnly ? "AND status = 'published'" : ''}`,
      )
      .get(slug),
  );
export const toolById = (id) =>
  serialize(db.prepare('SELECT * FROM tools WHERE id = ?').get(id), true);
export const toolBySubdomain = (subdomain) =>
  serialize(
    db.prepare("SELECT * FROM tools WHERE subdomain = ? AND status = 'published'").get(subdomain),
  );
export const linkTool = () =>
  serialize(
    db
      .prepare("SELECT * FROM tools WHERE module_key = 'link-shortener' AND status = 'published'")
      .get(),
  );
export const allTools = (user = null) =>
  db
    .prepare(
      `SELECT * FROM tools ${user?.role === 'contributor' ? 'WHERE owner_id = ?' : ''} ORDER BY id DESC`,
    )
    .all(...(user?.role === 'contributor' ? [user.id] : []));

export function listTools({
  search = '',
  category = '',
  tag = '',
  sort = 'newest',
  page = 1,
  limit = 24,
  featured = false,
} = {}) {
  const where = ["t.status = 'published'"];
  const params = [];
  if (search) {
    where.push(
      "(t.name LIKE ? ESCAPE '\\' OR t.tagline LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\')",
    );
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    params.push(pattern, pattern, pattern);
  }
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (tag) {
    where.push(
      'EXISTS (SELECT 1 FROM tool_tags tt JOIN tags g ON g.id = tt.tag_id WHERE tt.tool_id = t.id AND g.slug = ?)',
    );
    params.push(tag);
  }
  if (featured) where.push('t.featured = 1');
  const from = `FROM tools t LEFT JOIN categories c ON c.id = t.category_id WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS count ${from}`).get(...params).count;
  const orders = {
    newest: 't.published_at DESC, t.id DESC',
    name: 't.name COLLATE NOCASE, t.id',
    popular: 'popularity DESC, t.id DESC',
  };
  const rows = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM analytics_events a WHERE a.tool_id = t.id AND a.event = 'use') AS popularity ${from} ORDER BY ${orders[sort]} LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, (page - 1) * limit);
  return { tools: rows.map((row) => serialize(row)), total, page, limit };
}

export function saveTool(data, actor, id = null) {
  return db
    .transaction(() => {
      const existing = id ? toolById(id) : null;
      if (id && !existing) throw Object.assign(new Error('Tool not found.'), { status: 404 });
      const contributor = actor.role === 'contributor';
      if (
        !['owner', 'admin', 'contributor'].includes(actor.role) ||
        (contributor &&
          (!actor.developer_approved_at || (existing && existing.owner_id !== actor.id)))
      )
        throw new HttpError(403, 'Access denied.');

      assertExternalProject(data.external_url);
      if (data.module_key && data.external_url)
        throw Object.assign(new Error('Choose a local module or an external project URL.'), {
          status: 422,
        });
      if (contributor && (data.module_key || existing?.module_key))
        throw new HttpError(403, 'Only staff can manage executable modules.');
      if (contributor && data.status === 'pending' && !data.external_url)
        throw new HttpError(422, 'Enter the working project URL before requesting review.');
      if (
        contributor &&
        data.status === 'published' &&
        (!data.external_url || data.external_url !== existing?.approved_url)
      )
        throw new HttpError(
          403,
          'The owner must approve this project URL before you can publish it.',
        );
      if (
        actor.role === 'admin' &&
        (data.external_url || existing?.external_url) &&
        (data.status === 'published' || existing?.status === 'published')
      )
        throw Object.assign(new Error('External projects require owner approval.'), {
          status: 403,
        });
      if (data.status === 'published' && !data.module_key && !data.external_url)
        throw Object.assign(
          new Error('Publishing requires an implemented module or a working project URL.'),
          { status: 422 },
        );
      if (
        data.category_id &&
        !db.prepare('SELECT id FROM categories WHERE id = ?').get(data.category_id)
      )
        throw Object.assign(new Error('Category not found.'), { status: 422 });
      for (const tagId of data.tags)
        if (!db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId))
          throw Object.assign(new Error('Tag not found.'), { status: 422 });
      const timestamp = now();
      const publishedAt =
        data.status === 'published'
          ? existing?.published_at || timestamp
          : existing?.published_at || null;
      const approvedUrl =
        actor.role === 'owner' && data.status === 'published'
          ? data.external_url || null
          : existing?.approved_url || null;
      const featured = contributor
        ? existing?.featured && data.status === 'published'
        : data.featured;
      const fields = [
        data.slug,
        data.name,
        data.tagline,
        data.description,
        data.category_id,
        data.subdomain,
        data.module_key,
        data.status,
        featured ? 1 : 0,
        data.icon,
        data.external_url || null,
        data.repository_url || null,
        approvedUrl,
      ];
      if (id)
        db.prepare(
          'UPDATE tools SET slug=?, name=?, tagline=?, description=?, category_id=?, subdomain=?, module_key=?, status=?, featured=?, icon=?, external_url=?, repository_url=?, approved_url=?, published_at=?, updated_at=? WHERE id=?',
        ).run(...fields, publishedAt, timestamp, id);
      else
        id = Number(
          db
            .prepare(
              'INSERT INTO tools (slug,name,tagline,description,category_id,subdomain,module_key,status,featured,icon,external_url,repository_url,approved_url,owner_id,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            )
            .run(...fields, actor.id, publishedAt, timestamp, timestamp).lastInsertRowid,
        );
      db.prepare('DELETE FROM tool_tags WHERE tool_id = ?').run(id);
      for (const tagId of new Set(data.tags))
        db.prepare('INSERT INTO tool_tags (tool_id, tag_id) VALUES (?, ?)').run(id, tagId);
      if (
        actor.role === 'owner' &&
        data.status === 'published' &&
        approvedUrl &&
        existing?.owner_id
      )
        grantDeveloperAccess(existing.owner_id);
      recordActivity(actor.id, existing ? 'tool.update' : 'tool.create', 'tool', id, {
        status: data.status,
      });
      return id;
    })
    .immediate();
}
