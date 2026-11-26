import { db } from '@docksite/db';
import { platformUrl } from '@docksite/config/urls';
import { informationPages, helpArticles, docArticles } from '../content/catalog.js';
import { publicReleases } from '@docksite/db/repositories/content';

const xml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char],
  );
export function sitemap(req, res) {
  const entries = ['/', '/tools', '/categories'].map((path) => ({ url: platformUrl(path) }));

  for (const [path, page] of Object.entries(informationPages())) {
    if (page.state === 'informational') entries.push({ url: platformUrl(path) });
  }
  for (const path of ['/help', '/docs', '/changelog']) entries.push({ url: platformUrl(path) });
  for (const slug of Object.keys(helpArticles)) entries.push({ url: platformUrl('/help/' + slug) });
  for (const slug of Object.keys(docArticles)) entries.push({ url: platformUrl('/docs/' + slug) });
  for (const release of publicReleases())
    entries.push({ url: platformUrl('/changelog/' + release.slug), updated: release.updated_at });
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
