import { platformUrl } from '@docksite/config/urls';
import { informationPages, helpArticles, docArticles } from '../content/catalog.js';
import { publicReleases, publicRelease, insertReport } from '@docksite/db/repositories/content';
import { parse, slugSchema } from '@docksite/utils/validation';
import { reportSchema } from '@docksite/utils/content-validation';
import { HttpError } from '@docksite/utils/http';

export function renderInformation(res, page, url) {
  const noindex = ['draft', 'coming-soon'].includes(page.state);
  if (noindex) res.set('X-Robots-Tag', 'noindex, follow');
  res.render('information/page', {
    title: page.title,
    description: page.description,
    canonical: platformUrl(url),
    noindex,
    page,
  });
}
export function information(req, res, next) {
  const page = informationPages()[req.path];
  if (!page) return next();
  renderInformation(res, page, req.path);
}
export const helpIndex = (req, res) =>
  res.render('information/index', {
    title: 'Help',
    description: 'Practical guides for working Docksite features.',
    canonical: platformUrl('/help'),
    entries: helpArticles,
    prefix: '/help',
  });
export const docsIndex = (req, res) =>
  res.render('information/index', {
    title: 'Documentation',
    description: 'Public documentation for the current platform.',
    canonical: platformUrl('/docs'),
    entries: docArticles,
    prefix: '/docs',
  });
export function article(collection, prefix) {
  return (req, res) => {
    const page = collection[parse(slugSchema, req.params.slug)];
    if (!page) throw new HttpError(404, 'Article not found.');
    renderInformation(res, page, prefix + '/' + req.params.slug);
  };
}
export const helpArticle = article(helpArticles, '/help');
export const docArticle = article(docArticles, '/docs');
export const changelog = (req, res) =>
  res.render('information/changelog', {
    title: 'Changelog',
    description: 'Published release notes. Local development changes are recorded separately.',
    canonical: platformUrl('/changelog'),
    releases: publicReleases(),
  });
export function release(req, res) {
  const slug = slugSchema.safeParse(req.params.slug);
  const entry = slug.success ? publicRelease(slug.data) : null;
  if (!entry) throw new HttpError(404, 'Release note not found.');
  renderInformation(
    res,
    {
      title: entry.title,
      description: entry.summary,
      state: 'informational',
      version: entry.version,
      published_at: entry.published_at,
      sections: [{ heading: '', paragraphs: [entry.body] }],
    },
    '/changelog/' + entry.slug,
  );
}
export const reportForm = (req, res) =>
  res.render('information/report', {
    title: 'Report abuse',
    description: 'Store a private report for manual staff review.',
    canonical: platformUrl('/report-abuse'),
    submitted: false,
  });
export function report(req, res) {
  insertReport(parse(reportSchema, req.body));
  res
    .status(201)
    .set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow' })
    .render('information/report', {
      title: 'Report received',
      description: 'Your report has been stored for staff review.',
      canonical: platformUrl('/report-abuse'),
      noindex: true,
      submitted: true,
    });
}
