import { db, now } from '@docksite/db';
import { allTools, toolById, saveTool } from '@docksite/db/repositories/tools';
import { categories, tags } from '@docksite/db/repositories/taxonomy';
import { recordActivity } from '@docksite/db/repositories/activity';
import { parse, idSchema, toolSchema } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';

function accessibleTool(req) {
  const tool = toolById(parse(idSchema, req.params.id));
  if (!tool) throw new HttpError(404, 'Tool not found.');
  if (req.user.role === 'contributor' && tool.owner_id !== req.user.id)
    throw new HttpError(403, 'Access denied.');
  return tool;
}
export const index = (req, res) =>
  res.render('tools/index', { title: 'Tools', tools: allTools(req.user) });
export const createPage = (req, res) =>
  res.render('tools/form', {
    title: 'Create tool',
    tool: null,
    categories: categories(),
    tags: tags(),
  });
export const editPage = (req, res) =>
  res.render('tools/form', {
    title: 'Edit tool',
    tool: accessibleTool(req),
    categories: categories(),
    tags: tags(),
  });
export const detail = (req, res) =>
  res.render('tools/show', { title: 'Tool detail', tool: accessibleTool(req) });
export function create(req, res) {
  const id = saveTool(parse(toolSchema, req.body), req.user);
  req.session.flash = 'Tool created.';
  res.redirect(`${res.locals.basePath}/tools/${id}`);
}
export function update(req, res) {
  const id = saveTool(parse(toolSchema, req.body), req.user, parse(idSchema, req.params.id));
  req.session.flash = 'Tool updated.';
  res.redirect(`${res.locals.basePath}/tools/${id}`);
}
export function archive(req, res) {
  const tool = accessibleTool(req);
  db.transaction(() => {
    db.prepare(
      "UPDATE tools SET status = 'archived', featured = 0, updated_at = ? WHERE id = ?",
    ).run(now(), tool.id);
    recordActivity(req.user.id, 'tool.archive', 'tool', tool.id);
  })();
  res.redirect(`${res.locals.basePath}/tools`);
}
export function remove(req, res) {
  const tool = accessibleTool(req);
  if (req.user.role === 'contributor' && !['draft', 'pending'].includes(tool.status))
    throw new HttpError(403, 'Only drafts and pending tools can be deleted by contributors.');
  db.transaction(() => {
    db.prepare('DELETE FROM tools WHERE id = ?').run(tool.id);
    recordActivity(req.user.id, 'tool.delete', 'tool', tool.id);
  })();
  res.redirect(`${res.locals.basePath}/tools`);
}
