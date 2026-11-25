import express from 'express';
import { configureApp, finishApp } from '@docksite/ui';
import { cmsAccess } from './middleware/access.js';
import { formLimit } from '@docksite/auth/rate-limit';
import auth from './routes/auth.js';
import dashboard from './routes/dashboard.js';
import tools from './routes/tools.js';
import taxonomy from './routes/taxonomy.js';
import submissions from './routes/submissions.js';
import users from './routes/users.js';
import media from './routes/media.js';
import analytics from './routes/analytics.js';
import settings from './routes/settings.js';

export function createCmsApp() {
  const app = express();
  configureApp(app, 'cms', new URL('./', import.meta.url));
  app.use(auth);
  app.use(cmsAccess);
  const submissionLimit = formLimit(120);
  app.use((req, res, next) => (req.method === 'POST' ? submissionLimit(req, res, next) : next()));
  app.use(dashboard, tools, taxonomy, submissions, users, media, analytics, settings);
  finishApp(app);
  return app;
}
