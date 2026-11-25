import { db } from '@docksite/db';
import { platformUrl } from '@docksite/config/urls';

const xml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char],
  );
export function sitemap(req, res) {
  const entries = ['/', '/tools', '/categories'].map((path) => ({ url: platformUrl(path) }));
  for (const tool of db
    .prepare("SELECT slug, updated_at FROM tools WHERE status = 'published' ORDER BY id")
    .all())
    entries.push({ url: platformUrl(`/tools/${tool.slug}`), updated: tool.updated_at });
  for (const category of db.prepare('SELECT slug FROM categories ORDER BY id').all())
    entries.push({ url: platformUrl(`/categories/${category.slug}`) });
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${xml(entry.url)}</loc>${entry.updated ? `<lastmod>${xml(entry.updated)}</lastmod>` : ''}</url>`).join('')}</urlset>`,
    );
}
export const robots = (req, res) =>
  res
    .type('text/plain')
    .send(
      `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /cms\nDisallow: /setup\nSitemap: ${platformUrl('/sitemap.xml')}\n`,
    );
