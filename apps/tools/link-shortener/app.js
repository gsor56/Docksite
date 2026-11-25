import express from 'express';
import { configureApp, finishApp } from '@docksite/ui';
import { origin } from '@docksite/config/urls';
import { linkTool } from '@docksite/db/repositories/tools';
import { formLimit } from '@docksite/auth/rate-limit';
import auth from './routes/auth.js';
import links from './routes/links.js';
import redirects from './routes/redirects.js';

export function createLinkApp() {
  const app = express();
  configureApp(app, 'link', new URL('./', import.meta.url));
  app.use((req, res, next) => {
    req.tool = linkTool();
    if (!req.tool)
      return res.status(404).render('errors/404', {
        title: 'Tool unavailable',
        error: 'The URL Shortener has not been published.',
      });
    if (!res.locals.basePath && !req.gatewaySubdomain)
      res.locals.appOrigin = origin('link', req.tool.subdomain);
    next();
  });
  app.use(auth);
  const submissionLimit = formLimit(120);
  app.use((req, res, next) => (req.method === 'POST' ? submissionLimit(req, res, next) : next()));
  app.use(links, redirects);
  finishApp(app);
  return app;
}
