import { createLinkApp } from './app.js';
import { config } from '@docksite/config';
import { db } from '@docksite/db';

const server = createLinkApp().listen(config.LINK_PORT, '0.0.0.0', () =>
  console.log(`URL Shortener listening on port ${config.LINK_PORT}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
