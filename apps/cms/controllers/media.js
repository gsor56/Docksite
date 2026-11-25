import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '@docksite/config';
import { db, now } from '@docksite/db';
import { mediaList, findMedia } from '@docksite/db/repositories/media';
import { allTools, toolById } from '@docksite/db/repositories/tools';
import { recordActivity } from '@docksite/db/repositories/activity';
import { parse, idSchema, optionalId, futureDate } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';
import { imageType } from '@docksite/utils/uploads';

function accessibleMedia(req, allowExpired = false) {
  const media = findMedia(parse(idSchema, req.params.id));
  if (!media || (!allowExpired && media.expires_at && media.expires_at <= now()))
    throw new HttpError(404, 'File not found.');
  if (req.user.role === 'contributor' && media.owner_id !== req.user.id)
    throw new HttpError(403, 'Access denied.');
  return media;
}
export const index = (req, res) =>
  res.render('media', {
    title: 'Media',
    media: mediaList(req.user),
    tools: allTools(req.user),
    maxBytes: config.UPLOAD_MAX_BYTES,
  });
export async function create(req, res) {
  if (!req.file?.size) throw new HttpError(422, 'Choose a nonempty image file.');
  const type = imageType(req.file.buffer);
  if (type.mime !== req.file.mimetype)
    throw new HttpError(422, 'Declared MIME type does not match file content.');
  const toolId = parse(optionalId, req.body.tool_id);
  if (toolId) {
    const tool = toolById(toolId);
    if (!tool || (req.user.role === 'contributor' && tool.owner_id !== req.user.id))
      throw new HttpError(403, 'You cannot attach media to this tool.');
  }
  const expiresAt = futureDate(req.body.expires_at);
  const storedPath = `${randomUUID()}.${type.extension}`;
  const fullPath = resolve(config.UPLOAD_DIR, storedPath);
  await mkdir(config.UPLOAD_DIR, { recursive: true });
  await writeFile(fullPath, req.file.buffer, { flag: 'wx' });
  try {
    db.transaction(() => {
      const id = Number(
        db
          .prepare(
            'INSERT INTO media (owner_id,tool_id,original_name,stored_path,mime_type,size,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)',
          )
          .run(
            req.user.id,
            toolId,
            basename(req.file.originalname).slice(0, 200),
            storedPath,
            type.mime,
            req.file.size,
            expiresAt,
            now(),
          ).lastInsertRowid,
      );
      recordActivity(req.user.id, 'media.upload', 'media', id);
    })();
  } catch (error) {
    await unlink(fullPath);
    throw error;
  }
  res.redirect(`${res.locals.basePath}/media`);
}
export function file(req, res, next) {
  const media = accessibleMedia(req);
  res.set('Cache-Control', 'private, no-store');
  res.type(media.mime_type).sendFile(resolve(config.UPLOAD_DIR, media.stored_path), (error) => {
    if (error) next(error);
  });
}
export async function remove(req, res) {
  const media = accessibleMedia(req, true);
  await unlink(resolve(config.UPLOAD_DIR, media.stored_path)).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  db.transaction(() => {
    db.prepare('DELETE FROM media WHERE id = ?').run(media.id);
    recordActivity(req.user.id, 'media.delete', 'media', media.id);
  })();
  res.redirect(`${res.locals.basePath}/media`);
}
