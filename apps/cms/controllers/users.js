import { z } from 'zod';
import { allUsers, updateUser } from '@docksite/db/repositories/users';
import { parse, idSchema, checkbox } from '@docksite/utils/validation';

export const index = (req, res) => res.render('users', { title: 'Users', users: allUsers() });
export function update(req, res) {
  const data = parse(
    z.object({ role: z.enum(['owner', 'admin', 'contributor', 'user']), is_active: checkbox }),
    req.body,
  );
  updateUser(req.user, parse(idSchema, req.params.id), data.role, data.is_active);
  res.redirect(`${res.locals.basePath}/users`);
}
