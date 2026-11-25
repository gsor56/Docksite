import { randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from '@docksite/utils/http';

export function verifyCsrf(req, res, next) {
  const token = req.get('x-csrf-token') || req.body?._csrf;
  const expected = req.session.csrfToken;
  if (
    typeof token !== 'string' ||
    !expected ||
    Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  )
    return next(new HttpError(403, 'This form has expired. Reload the page and try again.'));
  const requestOrigin = req.get('origin');
  if (requestOrigin && requestOrigin !== res.locals.appOrigin)
    return next(new HttpError(403, 'Request origin is not allowed.'));
  if (req.get('sec-fetch-site') === 'cross-site')
    return next(new HttpError(403, 'Cross-site submissions are not allowed.'));
  next();
}
export function csrf(scope) {
  return (req, res, next) => {
    req.session.csrfToken ||= randomBytes(32).toString('hex');
    res.locals.csrfToken = req.session.csrfToken;
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (
      scope === 'cms' &&
      req.path === '/media' &&
      req.method === 'POST' &&
      req.is('multipart/form-data')
    )
      return next();
    return verifyCsrf(req, res, next);
  };
}
