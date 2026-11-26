import { Router } from 'express';
import { requireRoles } from '@docksite/auth/roles';
import { adminAccess } from '../middleware/access.js';
import { index, review, sendNotifications } from '../controllers/submissions.js';
const router = Router();
router.get('/submissions', adminAccess, index);
router.post('/submissions/:id/review', requireRoles('owner'), review);
router.post('/submissions/send-notifications', requireRoles('owner'), sendNotifications);
export default router;
