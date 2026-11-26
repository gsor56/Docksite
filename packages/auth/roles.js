import { HttpError } from '@docksite/utils/http';

export const canAccessCms = (user) =>
  Boolean(
    user?.is_active &&
    (['owner', 'admin'].includes(user.role) ||
      (user.role === 'contributor' && user.developer_approved_at)),
  );

export function requireUser(req, res, next) {
  if (!req.user) return res.redirect(`${res.locals.basePath}/login`);
  next();
}
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.redirect(`${res.locals.basePath}/login`);
    if (!roles.includes(req.user.role))
      return next(new HttpError(403, 'You do not have access to this page.'));
    next();
  };
}
