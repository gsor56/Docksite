import { canAccessCms, requireRoles } from '@docksite/auth/roles';
import { HttpError } from '@docksite/utils/http';

export function cmsAccess(req, res, next) {
  if (!req.user) return res.redirect(`${res.locals.basePath}/login`);
  if (!canAccessCms(req.user))
    return next(
      new HttpError(403, 'Your project needs owner approval before you can use the CMS.'),
    );
  next();
}
export const adminAccess = requireRoles('owner', 'admin');
