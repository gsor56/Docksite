import { db, now } from '../index.js';
import { config } from '@docksite/config';

export const platformName = () =>
  db.prepare("SELECT value FROM settings WHERE key = 'platform_name'").get()?.value;
export function savePlatformName(name, userId) {
  db.prepare(
    "UPDATE settings SET value = ?, updated_by = ?, updated_at = ? WHERE key = 'platform_name'",
  ).run(name, userId, now());
}

export function publicSettings() {
  const values = Object.fromEntries(
    db
      .prepare(
        "SELECT key,value FROM settings WHERE key IN ('contact_email','privacy_email','security_email','repository_url')",
      )
      .all()
      .map((row) => [row.key, row.value]),
  );
  return {
    contact_email: config.CONTACT_EMAIL,
    privacy_email: '',
    security_email: '',
    repository_url: config.REPOSITORY_URL,
    ...values,
  };
}
export function savePublicSettings(values, userId) {
  for (const [key, value] of Object.entries(values))
    db.prepare(
      'INSERT INTO settings (key,value,updated_by,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at',
    ).run(key, value, userId, now(), now());
}
