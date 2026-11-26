import { createPlatformApp } from './apps/platform/app.js';
import { config } from '@docksite/config';
import { db, migrate } from '@docksite/db';
import { startReviewEmailWorker } from '@docksite/utils/review-email';

const applied = migrate();
if (applied.length) console.log(`Applied migrations: ${applied.join(', ')}`);

const server = createPlatformApp().listen(config.PORT, '0.0.0.0', () => {
  console.log(`Docksite listening on port ${config.PORT}`);
  startReviewEmailWorker();
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
