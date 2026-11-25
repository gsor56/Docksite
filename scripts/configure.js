import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

let environment = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
for (const name of [
  'SESSION_SECRET',
  'CMS_SESSION_SECRET',
  'ANALYTICS_HASH_SECRET',
  'SETUP_TOKEN',
]) {
  environment = environment.replace(
    new RegExp(`^${name}=$`, 'm'),
    `${name}=${randomBytes(32).toString('hex')}`,
  );
}
try {
  await writeFile(new URL('../.env', import.meta.url), environment, { flag: 'wx', mode: 0o600 });
  console.log('Created .env with fresh secrets. Owner credentials remain unset.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.env already exists; no settings were changed.');
}
