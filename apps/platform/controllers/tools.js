import { z } from 'zod';
import { platformUrl } from '@docksite/config/urls';
import { findTool, listTools } from '@docksite/db/repositories/tools';
import { categories, tags } from '@docksite/db/repositories/taxonomy';
import { recordEvent } from '@docksite/db/repositories/analytics';
import { parse, directorySchema, slugSchema } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';

export function directory(req, res) {
  const filters = parse(directorySchema, req.query);
  res.render('tools/index', {
    title: 'Tools',
    canonical: platformUrl('/tools'),
    result: listTools(filters),
    filters,
    categories: categories(),
    tags: tags(),
  });
}
export const toolsApi = (req, res) => res.json(listTools(parse(directorySchema, req.query)));
export function toolApi(req, res) {
  const tool = findTool(parse(slugSchema, req.params.slug));
  if (!tool) throw new HttpError(404, 'Tool not found.');
  res.json(tool);
}
export function landing(req, res) {
  const tool = findTool(parse(slugSchema, req.params.slug));
  if (!tool) throw new HttpError(404, 'Tool not found.');
  if (req.method !== 'HEAD') recordEvent(tool.id, req.user?.id || null, 'view');
  const related = tool.category
    ? listTools({ category: tool.category.slug, limit: 6 }).tools.filter(
        (item) => item.id !== tool.id,
      )
    : [];
  const canonical = platformUrl(`/tools/${tool.slug}`);
  res.render('tools/show', {
    title: tool.name,
    description: tool.tagline,
    canonical,
    tool,
    related,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: tool.name,
      description: tool.description,
      url: tool.url,
      mainEntityOfPage: canonical,
      applicationCategory: tool.category?.name,
      operatingSystem: 'Web browser',
      dateCreated: tool.created_at,
      dateModified: tool.updated_at,
    },
  });
}
export function shareTool(req, res) {
  const slug = parse(z.string().min(2).max(60), req.params.slug);
  const tool = findTool(slug);
  if (!tool) throw new HttpError(404, 'Tool not found.');
  recordEvent(tool.id, req.user?.id || null, 'share');
  res.sendStatus(204);
}
