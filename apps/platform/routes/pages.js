import { Router } from 'express';
import { config } from '@docksite/config';
import { requireUser } from '@docksite/auth/roles';
import { formLimit } from '@docksite/auth/rate-limit';
import * as pages from '../controllers/pages.js';

const router = Router();
router.get('/', pages.home);
router.get('/categories', pages.categoryIndex);
router.get('/categories/:slug', pages.categoryShow);
router.get('/build', pages.buildPage);
router.post('/build', requireUser, formLimit(config.SUBMISSION_RATE_MAX), pages.submitIdea);
router.get('/dashboard', requireUser, pages.dashboard);
router.get('/privacy', pages.privacy);
router.get('/terms', pages.terms);
export default router;
