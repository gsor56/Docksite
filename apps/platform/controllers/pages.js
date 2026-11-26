import { platformUrl } from '@docksite/config/urls';
import { db } from '@docksite/db';
import { listTools, linkTool } from '@docksite/db/repositories/tools';
import { categories, findCategory } from '@docksite/db/repositories/taxonomy';
import { parse, submissionSchema } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';
import { submitProject } from '@docksite/db/repositories/submissions';

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
  res.render('build', { title: 'Submit your project', categories: categories() });
export function submitIdea(req, res) {
  const data = parse(submissionSchema, req.body);
  if (
    data.category_id &&
    !db.prepare('SELECT id FROM categories WHERE id = ?').get(data.category_id)
  )
    throw new HttpError(422, 'Category not found.');
  submitProject(data, req.user);
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
