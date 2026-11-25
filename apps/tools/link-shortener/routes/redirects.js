import { Router } from 'express';
import { formLimit } from '@docksite/auth/rate-limit';
import { redirect, unlock } from '../controllers/redirects.js';
const router = Router();
router.post('/:code/unlock', formLimit(10), unlock);
router.get('/:code', redirect);
export default router;
