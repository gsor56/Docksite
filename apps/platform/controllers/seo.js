import { db } from '@docksite/db';
import { platformUrl } from '@docksite/config/urls';
import { informationPages, helpArticles, docArticles } from '../content/catalog.js';
import { publicReleases } from '@docksite/db/repositories/content';

const xml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char],
  );
function publicPages() {
  const entries = [
    '/',
    '/tools',
    '/categories',
    '/help',
    '/docs',
    '/changelog',
    '/report-abuse',
  ].map((path) => ({ path }));
  for (const [path, page] of Object.entries(informationPages())) {
    if (page.state === 'informational') entries.push({ path });
  }
  for (const slug of Object.keys(helpArticles)) entries.push({ path: '/help/' + slug });
  for (const slug of Object.keys(docArticles)) entries.push({ path: '/docs/' + slug });
  for (const release of publicReleases())
    entries.push({
      path: '/changelog/' + encodeURIComponent(release.slug),
      updated: release.updated_at,
    });
  for (const tool of db
    .prepare("SELECT slug, updated_at FROM tools WHERE status = 'published' ORDER BY id")
    .all())
    entries.push({ path: '/tools/' + encodeURIComponent(tool.slug), updated: tool.updated_at });
  for (const category of db.prepare('SELECT slug FROM categories ORDER BY id').all())
    entries.push({ path: '/categories/' + encodeURIComponent(category.slug) });
  return entries;
}

export function sitemap(req, res) {
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPages()
      .map(
        ({ path, updated }) =>
          `<url><loc>${xml(platformUrl(path))}</loc>${updated ? `<lastmod>${xml(updated)}</lastmod>` : ''}</url>`,
      )
      .join('')}</urlset>`,
  );
}
export const robots = (req, res) =>
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${platformUrl('/sitemap.xml')}\n`);

export function humans(req, res) {
  const { platformName, repositoryUrl } = res.locals;
  const lines = [
    platformName,
    'A directory of independent web tools.',
    'Built with Express, EJS and SQLite. MIT licensed.',
  ];
  if (repositoryUrl) lines.push('Source: ' + repositoryUrl);
  res.type('text/plain').send(lines.join('\n') + '\n');
}

export function llms(req, res) {
  const name = res.locals.platformName.replace(/\s+/g, ' ');
  const pages = publicPages().map(({ path }) => `- [${path}](${platformUrl(path)})`);
  res
    .type('text/plain')
    .send(
      [
        '# ' + name,
        '',
        '> A directory of independent web tools and their public landing pages.',
        '',
        '[XML sitemap](' + platformUrl('/sitemap.xml') + ')',
        '',
        '## Public pages',
        '',
        ...pages,
        '',
      ].join('\n'),
    );
}
