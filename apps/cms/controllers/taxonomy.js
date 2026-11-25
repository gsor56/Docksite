import { db, now } from '@docksite/db';
import { categories, tags } from '@docksite/db/repositories/taxonomy';
import { recordActivity } from '@docksite/db/repositories/activity';
import { parse, idSchema, taxonomySchema } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';

export const categoryPage = (req, res) =>
  res.render('categories', { title: 'Categories', items: categories() });
export const tagPage = (req, res) => res.render('tags', { title: 'Tags', items: tags() });
export function saveTaxonomy(table) {
  return (req, res) => {
    const data = parse(taxonomySchema, req.body);
    const id = req.params.id ? parse(idSchema, req.params.id) : null;
    db.transaction(() => {
      if (id && !db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id))
        throw new HttpError(404, 'Record not found.');
      let entityId = id;
      if (table === 'categories') {
        if (id)
          db.prepare('UPDATE categories SET slug = ?, name = ?, description = ? WHERE id = ?').run(
            data.slug,
            data.name,
            data.description,
            id,
          );
        else
          entityId = Number(
            db
              .prepare(
                'INSERT INTO categories (slug, name, description, created_at) VALUES (?, ?, ?, ?)',
              )
              .run(data.slug, data.name, data.description, now()).lastInsertRowid,
          );
      } else {
        if (id)
          db.prepare('UPDATE tags SET slug = ?, name = ? WHERE id = ?').run(
            data.slug,
            data.name,
            id,
          );
        else
          entityId = Number(
            db.prepare('INSERT INTO tags (slug, name) VALUES (?, ?)').run(data.slug, data.name)
              .lastInsertRowid,
          );
      }
      recordActivity(req.user.id, id ? 'taxonomy.update' : 'taxonomy.create', table, entityId);
    })();
    res.redirect(`${res.locals.basePath}/${table}`);
  };
}
export function removeTaxonomy(table) {
  return (req, res) => {
    const id = parse(idSchema, req.params.id);
    db.transaction(() => {
      if (!db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes)
        throw new HttpError(404, 'Record not found.');
      recordActivity(req.user.id, 'taxonomy.delete', table, id);
    })();
    res.redirect(`${res.locals.basePath}/${table}`);
  };
}
