import { Router } from 'express';
import { adminAccess } from '../middleware/access.js';
import { index, update } from '../controllers/settings.js';
const router = Router();
router.get('/settings', adminAccess, index);
router.post('/settings', adminAccess, update);
export default router;
