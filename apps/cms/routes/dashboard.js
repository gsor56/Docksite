import { Router } from 'express';
import { dashboard } from '../controllers/dashboard.js';
const router = Router();
router.get('/', (req, res) => res.redirect(`${res.locals.basePath}/dashboard`));
router.get('/dashboard', dashboard);
export default router;
