import express from 'express';
import { configureApp, finishApp } from '@docksite/ui';
import { createCmsApp } from '../cms/app.js';
import { createLinkApp } from '../tools/link-shortener/app.js';
import { toolBySubdomain } from '@docksite/db/repositories/tools';
import { subdomainRouting } from './middleware/subdomains.js';
import auth from './routes/auth.js';
import pages from './routes/pages.js';
import tools from './routes/tools.js';
import api from './routes/api.js';
import seo from './routes/seo.js';

export function createPlatformApp({ localGateway = true } = {}) {
  const app = express();
  if (localGateway) {
    const cms = createCmsApp();
    const shortener = createLinkApp();
    app.use(subdomainRouting(cms, shortener));
    app.use('/cms', cms);
    app.use('/t/:subdomain', (req, res, next) => {
      const tool = toolBySubdomain(req.params.subdomain);
      if (tool?.module_key === 'link-shortener') return shortener(req, res, next);
      req.unknownSubdomain = true;
      next();
    });
  }
  configureApp(app, 'platform', new URL('./', import.meta.url));
  app.use((req, res, next) =>
    req.unknownSubdomain
      ? res
          .status(404)
          .render('errors/404', { title: 'Tool not found', error: 'This tool is unavailable.' })
      : next(),
  );
  app.use(auth, pages, tools, api, seo);
  finishApp(app);
  return app;
}
