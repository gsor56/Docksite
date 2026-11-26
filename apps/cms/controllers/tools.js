import { db, now } from '@docksite/db';
import { toolAliasUrl } from '@docksite/config/urls';
import { allTools, toolById, saveTool } from '@docksite/db/repositories/tools';
import { categories, tags } from '@docksite/db/repositories/taxonomy';
import { recordActivity } from '@docksite/db/repositories/activity';
import { parse, idSchema, toolSchema } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';
import { syncToolSubmission, withdrawToolSubmission } from '@docksite/db/repositories/submissions';

function accessibleTool(req) {
  const tool = toolById(parse(idSchema, req.params.id));
  if (!tool) throw new HttpError(404, 'Tool not found.');
  if (req.user.role === 'contributor' && (tool.owner_id !== req.user.id || tool.module_key))
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
export function detail(req, res) {
  const tool = accessibleTool(req);
  res.render('tools/show', { title: 'Tool detail', tool, toolAddress: toolAliasUrl(tool) });
}

function writeListing(data, actor, id) {
  const toolId = saveTool(data, actor, id);
  syncToolSubmission(toolId, actor);
  return toolId;
}
function saveListing(req, res, data, id = null) {
  const saved = db.transaction(() => writeListing(data, req.user, id)).immediate();
  req.session.flash =
    data.status === 'published'
      ? 'Tool published.'
      : data.status === 'pending'
        ? 'Tool sent for review.'
        : 'Tool saved.';
  res.redirect(`${res.locals.basePath}/tools/${saved}`);
}
export const create = (req, res) => saveListing(req, res, parse(toolSchema, req.body));
export const update = (req, res) =>
  saveListing(req, res, parse(toolSchema, req.body), parse(idSchema, req.params.id));

export function publish(req, res) {
  const id = db
    .transaction(() => {
      const tool = accessibleTool(req);
      return writeListing(
        { ...tool, tags: tool.tags.map((tag) => tag.id), status: 'published' },
        req.user,
        tool.id,
      );
    })
    .immediate();
  req.session.flash = 'Tool published.';
  res.redirect(`${res.locals.basePath}/tools/${id}`);
}
export function archive(req, res) {
  db.transaction(() => {
    const tool = accessibleTool(req);
    db.prepare("UPDATE tools SET status='archived',featured=0,updated_at=? WHERE id=?").run(
      now(),
      tool.id,
    );
    withdrawToolSubmission(tool.id);
    recordActivity(req.user.id, 'tool.archive', 'tool', tool.id);
  }).immediate();
  req.session.flash = 'Tool unpublished.';
  res.redirect(`${res.locals.basePath}/tools`);
}
export function remove(req, res) {
  db.transaction(() => {
    const tool = accessibleTool(req);
    withdrawToolSubmission(tool.id);
    db.prepare('DELETE FROM tools WHERE id = ?').run(tool.id);
    recordActivity(req.user.id, 'tool.delete', 'tool', tool.id);
  }).immediate();
  res.redirect(`${res.locals.basePath}/tools`);
}
