import { config } from '@docksite/config';
import { platformUrl } from '@docksite/config/urls';
import { db, now } from '@docksite/db';
import { listTools, linkTool } from '@docksite/db/repositories/tools';
import { categories, findCategory } from '@docksite/db/repositories/taxonomy';
import { parse, submissionSchema } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';

export function home(req, res) {
  res.render('home', {
    title: res.locals.platformName,
    canonical: platformUrl('/'),
    total: listTools({ limit: 1 }).total,
    featured: listTools({ featured: true, limit: 6 }).tools,
    recent: listTools({ limit: 6 }).tools,
    categories: categories(),
  });
}
export const categoryIndex = (req, res) =>
  res.render('categories/index', {
    title: 'Categories',
    canonical: platformUrl('/categories'),
    categories: categories(),
  });
export function categoryShow(req, res) {
  const category = findCategory(req.params.slug);
  if (!category) throw new HttpError(404, 'Category not found.');
  res.render('categories/show', {
    title: category.name,
    description: category.description,
    canonical: platformUrl(`/categories/${category.slug}`),
    category,
    result: listTools({ category: category.slug, limit: 100 }),
  });
}
export const buildPage = (req, res) =>
  res.render('build', { title: 'Build with us', categories: categories() });
export function submitIdea(req, res) {
  const data = parse(submissionSchema, req.body);
  if (
    data.category_id &&
    !db.prepare('SELECT id FROM categories WHERE id = ?').get(data.category_id)
  )
    throw new HttpError(422, 'Category not found.');
  db.prepare(
    'INSERT INTO tool_submissions (title,idea,category_id,submitted_by,created_at,updated_at) VALUES (?,?,?,?,?,?)',
  ).run(data.title, data.idea, data.category_id, req.user.id, now(), now());
  req.session.flash = 'Your submission is awaiting review.';
  res.redirect('/dashboard');
}
export function dashboard(req, res) {
  const submissions = db
    .prepare('SELECT * FROM tool_submissions WHERE submitted_by = ? ORDER BY id DESC')
    .all(req.user.id);
  const links = db
    .prepare('SELECT COUNT(*) AS total FROM short_links WHERE user_id = ? AND deleted_at IS NULL')
    .get(req.user.id).total;
  res.render('dashboard', { title: 'Dashboard', submissions, links, shortener: linkTool() });
}
export const privacy = (req, res) =>
  res.render('privacy', { title: 'Privacy', retention: config.ANALYTICS_RETENTION_DAYS });
export const terms = (req, res) => res.render('terms', { title: 'Terms' });
