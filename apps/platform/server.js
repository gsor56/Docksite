import { createPlatformApp } from './app.js';
import { config } from '@docksite/config';
import { db } from '@docksite/db';
import { startReviewEmailWorker } from '@docksite/utils/review-email';
startReviewEmailWorker();

const server = createPlatformApp().listen(config.PORT, '0.0.0.0', () =>
  console.log(`Platform listening on port ${config.PORT}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
