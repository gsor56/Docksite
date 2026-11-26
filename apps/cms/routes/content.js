import { Router } from 'express';
import { adminAccess } from '../middleware/access.js';
import * as content from '../controllers/content.js';

const router = Router();
router.use(['/releases', '/reports'], adminAccess);
router.get('/releases', content.releases);
router.get('/releases/new', content.releaseForm);
router.post('/releases', content.saveRelease);
router.get('/releases/:id/edit', content.releaseForm);
router.post('/releases/:id', content.saveRelease);
router.post('/releases/:id/delete', content.removeRelease);
router.get('/reports', content.reports);
router.get('/reports/:id', content.reportDetail);
router.post('/reports/:id/review', content.reviewReport);
export default router;
