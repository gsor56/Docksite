import { Router } from 'express';
import { adminAccess } from '../middleware/access.js';
import { categoryPage, tagPage, saveTaxonomy, removeTaxonomy } from '../controllers/taxonomy.js';
const router = Router();
for (const [table, page] of [
  ['categories', categoryPage],
  ['tags', tagPage],
]) {
  router.get(`/${table}`, adminAccess, page);
  router.post(`/${table}`, adminAccess, saveTaxonomy(table));
  router.post(`/${table}/:id`, adminAccess, saveTaxonomy(table));
  router.post(`/${table}/:id/delete`, adminAccess, removeTaxonomy(table));
}
export default router;
