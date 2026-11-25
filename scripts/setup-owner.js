import bcrypt from 'bcrypt';
import { config } from '@docksite/config';
import { db, requireSchema } from '@docksite/db';
import { insertUser, ownerExists } from '@docksite/db/repositories/users';
import { recordActivity } from '@docksite/db/repositories/activity';
import { parse, registerSchema } from '@docksite/utils/validation';

try {
  requireSchema();
  if (ownerExists()) throw new Error('Owner setup is already complete.');
  const data = parse(registerSchema, {
    username: config.OWNER_USERNAME,
    email: config.OWNER_EMAIL,
    password: config.OWNER_PASSWORD,
  });
  const passwordHash = await bcrypt.hash(data.password, 12);
  db.transaction(() => {
    if (ownerExists()) throw new Error('Owner setup is already complete.');
    const user = insertUser({ ...data, passwordHash, role: 'owner' });
    recordActivity(user.id, 'owner.setup', 'user', user.id);
  })();
  console.log('Owner created. Remove OWNER_PASSWORD and SETUP_TOKEN from the environment.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
