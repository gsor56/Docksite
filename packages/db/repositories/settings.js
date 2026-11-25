import { db, now } from '../index.js';

export const platformName = () =>
  db.prepare("SELECT value FROM settings WHERE key = 'platform_name'").get()?.value;
export function savePlatformName(name, userId) {
  db.prepare(
    "UPDATE settings SET value = ?, updated_by = ?, updated_at = ? WHERE key = 'platform_name'",
  ).run(name, userId, now());
}
