import { db, now } from '../index.js';
import { toolUrl } from '@docksite/config/urls';
import { recordActivity } from './activity.js';

function serialize(row) {
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
  return { ...row, category, tags: tagRows, featured: Boolean(row.featured), url: toolUrl(row) };
}
export const findTool = (slug, publishedOnly = true) =>
  serialize(
    db
      .prepare(
        `SELECT * FROM tools WHERE slug = ? ${publishedOnly ? "AND status = 'published'" : ''}`,
      )
      .get(slug),
  );
export const toolById = (id) => serialize(db.prepare('SELECT * FROM tools WHERE id = ?').get(id));
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
  return { tools: rows.map(serialize), total, page, limit };
}

export function saveTool(data, actor, id = null) {
  return db.transaction(() => {
    const existing = id ? toolById(id) : null;
    if (id && !existing) throw Object.assign(new Error('Tool not found.'), { status: 404 });
    if (actor.role === 'contributor' && existing?.owner_id !== actor.id && existing)
      throw Object.assign(new Error('Access denied.'), { status: 403 });
    if (
      actor.role === 'contributor' &&
      (!['draft', 'pending'].includes(data.status) ||
        (existing && !['draft', 'pending'].includes(existing.status)))
    )
      throw Object.assign(
        new Error('Contributors can manage their own drafts and pending tools.'),
        { status: 403 },
      );
    if (data.status === 'published' && data.module_key !== 'link-shortener')
      throw Object.assign(new Error('Publishing requires an implemented tool module.'), {
        status: 422,
      });
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
    const fields = [
      data.slug,
      data.name,
      data.tagline,
      data.description,
      data.category_id,
      data.subdomain,
      data.module_key,
      data.status,
      data.featured ? 1 : 0,
      data.icon,
    ];
    if (id)
      db.prepare(
        'UPDATE tools SET slug=?, name=?, tagline=?, description=?, category_id=?, subdomain=?, module_key=?, status=?, featured=?, icon=?, published_at=?, updated_at=? WHERE id=?',
      ).run(...fields, publishedAt, timestamp, id);
    else
      id = Number(
        db
          .prepare(
            'INSERT INTO tools (slug,name,tagline,description,category_id,subdomain,module_key,status,featured,icon,owner_id,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          )
          .run(...fields, actor.id, publishedAt, timestamp, timestamp).lastInsertRowid,
      );
    db.prepare('DELETE FROM tool_tags WHERE tool_id = ?').run(id);
    for (const tagId of new Set(data.tags))
      db.prepare('INSERT INTO tool_tags (tool_id, tag_id) VALUES (?, ?)').run(id, tagId);
    recordActivity(actor.id, existing ? 'tool.update' : 'tool.create', 'tool', id, {
      status: data.status,
    });
    return id;
  })();
}
