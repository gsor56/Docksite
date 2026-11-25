import { Router } from 'express';
import { adminAccess } from '../middleware/access.js';
import { index, review } from '../controllers/submissions.js';
const router = Router();
router.get('/submissions', adminAccess, index);
router.post('/submissions/:id/review', adminAccess, review);
export default router;
