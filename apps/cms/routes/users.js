import { Router } from 'express';
import { adminAccess } from '../middleware/access.js';
import { index, update } from '../controllers/users.js';
const router = Router();
router.get('/users', adminAccess, index);
router.post('/users/:id', adminAccess, update);
export default router;
