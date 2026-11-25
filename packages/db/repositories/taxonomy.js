import { db } from '../index.js';

export const categories = () =>
  db
    .prepare(
      "SELECT c.*, COUNT(t.id) AS tool_count FROM categories c LEFT JOIN tools t ON t.category_id = c.id AND t.status = 'published' GROUP BY c.id ORDER BY c.name COLLATE NOCASE",
    )
    .all();
export const tags = () => db.prepare('SELECT * FROM tags ORDER BY name COLLATE NOCASE').all();
export const findCategory = (slug) =>
  db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
