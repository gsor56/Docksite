import express from 'express';
import morgan from 'morgan';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { config } from '@docksite/config';
import { origin, platformUrl, cmsUrl } from '@docksite/config/urls';
import { requireSchema } from '@docksite/db';
import { platformName } from '@docksite/db/repositories/settings';
import { ownerExists } from '@docksite/db/repositories/users';
import { authentication } from '@docksite/auth';
import { csrf } from '@docksite/auth/csrf';

const uiPath = fileURLToPath(new URL('./', import.meta.url));
const logo = readFileSync(new URL('./assets/docksite-lockup.svg', import.meta.url), 'utf8')
  .replace(/<\?xml[^>]*>/g, '')
  .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
  .replace(/xmlns:c2pa="[^"]*"/g, '')
  .replace(/width="1164" height="256"/, 'width="146" height="32"');
export function configureApp(app, scope, appDirectory) {
  requireSchema();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);
  app.set('view engine', 'ejs');
  app.set('views', [fileURLToPath(new URL('./views/', appDirectory)), `${uiPath}views`]);
  app.use((req, res, next) => {
    const basePath = req.baseUrl;
    res.locals.basePath = basePath;
    res.locals.scope = scope;
    res.locals.user = null;
    res.locals.flash = null;
    res.locals.csrfToken = '';
    res.locals.appOrigin = req.gatewaySubdomain
      ? `${config.URL_SCHEME}://${req.gatewaySubdomain}.${config.BASE_DOMAIN}${config.NODE_ENV === 'production' ? '' : ':' + config.PORT}`
      : basePath
        ? origin()
        : origin(scope, scope === 'cms' ? 'cms' : scope === 'link' ? 'link' : '');
    res.locals.platformUrl = platformUrl;
    res.locals.cmsUrl = cmsUrl;
    res.locals.platformName = platformName();
    res.locals.ownerReady = ownerExists();
    res.locals.logo = logo;
    res.locals.title = res.locals.platformName;
    res.locals.description = '';
    res.locals.canonical = null;
    res.locals.structuredData = null;
    res.locals.nonce = randomBytes(16).toString('base64');
    res.locals.date = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '—');
    res.locals.jsonLd = (value) =>
      JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
    res.set({
      'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${res.locals.nonce}'; style-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    if (config.URL_SCHEME === 'https') res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
  app.use('/assets', express.static(`${uiPath}public`, { maxAge: '1h' }));
  app.use('/assets/brand', express.static(`${uiPath}assets`, { maxAge: '1d' }));
  app.use(
    '/assets',
    express.static(fileURLToPath(new URL('./public/', appDirectory)), { maxAge: '1h' }),
  );
  if (config.NODE_ENV === 'development') app.use(morgan('dev'));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(express.json({ limit: '64kb' }));
  app.use(...authentication(scope));
  app.use(csrf(scope));
}

export function finishApp(app) {
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
    return res.status(404).render('errors/404', {
      title: 'Page not found',
      error: 'The requested page does not exist.',
    });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    let status = error.status || 500;
    let message = error.message;
    if (error.code?.startsWith('SQLITE_CONSTRAINT')) {
      status = 409;
      message = 'This change conflicts with an existing record or a record still in use.';
    }
    if (error.name === 'MulterError') {
      status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 422;
      message = 'Upload rejected. Check the file size and field.';
    }
    if (status >= 500) {
      console.error(error);
      message = 'Something went wrong. Please try again.';
    }
    if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
    return res
      .status(status)
      .render(status >= 500 ? 'errors/500' : status === 404 ? 'errors/404' : 'errors/403', {
        title: status >= 500 ? 'Server error' : 'Request could not be completed',
        error: message,
      });
  });
}
