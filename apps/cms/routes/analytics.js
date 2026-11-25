import { Router } from 'express';
import { adminAccess } from '../middleware/access.js';
import { analytics, activity } from '../controllers/analytics.js';
const router = Router();
router.get('/analytics', adminAccess, analytics);
router.get('/activity', adminAccess, activity);
export default router;
