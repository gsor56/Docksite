import { createCmsApp } from './app.js';
import { config } from '@docksite/config';
import { db } from '@docksite/db';

const server = createCmsApp().listen(config.CMS_PORT, '0.0.0.0', () =>
  console.log(`CMS listening on port ${config.CMS_PORT}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
