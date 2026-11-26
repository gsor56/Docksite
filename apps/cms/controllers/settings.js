import { z } from 'zod';
import { db } from '@docksite/db';
import {
  platformName,
  savePlatformName,
  publicSettings,
  savePublicSettings,
} from '@docksite/db/repositories/settings';
import { recordActivity } from '@docksite/db/repositories/activity';
import { parse } from '@docksite/utils/validation';

const optionalEmail = z.union([z.literal(''), z.email().trim().max(254)]).default('');
export const index = (req, res) =>
  res.render('settings', {
    title: 'Settings',
    name: platformName(),
    publicConfig: publicSettings(),
  });
export function update(req, res) {
  const data = parse(
    z.object({
      platform_name: z.string().trim().min(1).max(80),
      contact_email: optionalEmail,
      privacy_email: optionalEmail,
      security_email: optionalEmail,
      repository_url: z
        .union([z.literal(''), z.url().refine((value) => value.startsWith('https://'))])
        .default(''),
    }),
    req.body,
  );
  db.transaction(() => {
    savePlatformName(data.platform_name, req.user.id);
    const { platform_name, ...settings } = data;
    savePublicSettings(settings, req.user.id);
    recordActivity(req.user.id, 'settings.update', 'settings', null, {
      keys: [platform_name, ...Object.keys(settings)],
    });
  })();
  res.redirect(res.locals.basePath + '/settings');
}
