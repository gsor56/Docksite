import { z } from 'zod';
import { db } from '@docksite/db';
import { platformName, savePlatformName } from '@docksite/db/repositories/settings';
import { recordActivity } from '@docksite/db/repositories/activity';
import { parse } from '@docksite/utils/validation';

export const index = (req, res) =>
  res.render('settings', { title: 'Settings', name: platformName() });
export function update(req, res) {
  const data = parse(z.object({ platform_name: z.string().trim().min(1).max(80) }), req.body);
  db.transaction(() => {
    savePlatformName(data.platform_name, req.user.id);
    recordActivity(req.user.id, 'settings.update', 'settings', null, { key: 'platform_name' });
  })();
  res.redirect(`${res.locals.basePath}/settings`);
}
