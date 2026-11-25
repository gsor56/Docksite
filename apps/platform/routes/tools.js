import { Router } from 'express';
import { directory, landing } from '../controllers/tools.js';
const router = Router();
router.get('/tools', directory);
router.get('/tools/:slug', landing);
export default router;
