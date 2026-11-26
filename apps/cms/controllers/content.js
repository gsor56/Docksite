import * as repository from '@docksite/db/repositories/content';
import { parse, idSchema } from '@docksite/utils/validation';
import { releaseSchema, reportReviewSchema } from '@docksite/utils/content-validation';
import { HttpError } from '@docksite/utils/http';

export const releases = (req, res) =>
  res.render('releases/index', { title: 'Release notes', releases: repository.allReleases() });
export function releaseForm(req, res) {
  const release = req.params.id ? repository.releaseById(parse(idSchema, req.params.id)) : null;
  if (req.params.id && !release) throw new HttpError(404, 'Release note not found.');
  res.render('releases/form', {
    title: release ? 'Edit release note' : 'New release note',
    release,
  });
}
export function saveRelease(req, res) {
  const id = repository.saveRelease(
    parse(releaseSchema, req.body),
    req.user,
    req.params.id ? parse(idSchema, req.params.id) : null,
  );
  res.redirect(res.locals.basePath + '/releases/' + id + '/edit');
}
export function removeRelease(req, res) {
  repository.removeRelease(parse(idSchema, req.params.id), req.user);
  res.redirect(res.locals.basePath + '/releases');
}
export const reports = (req, res) =>
  res.render('reports/index', { title: 'Abuse reports', reports: repository.reportsList() });
export function reportDetail(req, res) {
  const report = repository.reportById(parse(idSchema, req.params.id));
  if (!report) throw new HttpError(404, 'Report not found.');
  res.render('reports/show', { title: 'Review report', report });
}
export function reviewReport(req, res) {
  repository.reviewReport(
    parse(idSchema, req.params.id),
    parse(reportReviewSchema, req.body),
    req.user,
  );
  res.redirect(res.locals.basePath + '/reports/' + req.params.id);
}
