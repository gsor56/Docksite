import { Router } from 'express';
import { toolsApi, toolApi, shareTool } from '../controllers/tools.js';
import { formLimit } from '@docksite/auth/rate-limit';
const router = Router();
router.get('/api/tools', toolsApi);
router.get('/api/tools/:slug', toolApi);
router.post('/api/tools/:slug/share', formLimit(30), shareTool);
export default router;
