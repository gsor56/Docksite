import { db, migrate } from './index.js';

try {
  const applied = migrate();
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
} finally {
  db.close();
}
