import { requireRoles } from '@docksite/auth/roles';
export const cmsAccess = requireRoles('owner', 'admin', 'contributor');
export const adminAccess = requireRoles('owner', 'admin');
