import { Router } from 'express';
import { config } from '@docksite/config';
import { formLimit } from '@docksite/auth/rate-limit';
import * as information from '../controllers/information.js';

const router = Router();
router.get('/help', information.helpIndex);
router.get('/help/:slug', information.helpArticle);
router.get('/docs', information.docsIndex);
router.get('/docs/:slug', information.docArticle);
router.get('/changelog', information.changelog);
router.get('/changelog/:slug', information.release);
router.get('/report-abuse', information.reportForm);
router.post('/report-abuse', formLimit(config.SUBMISSION_RATE_MAX), information.report);
router.get('/{*path}', information.information);
export default router;
