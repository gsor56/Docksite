import bcrypt from 'bcrypt';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';
import { db, now } from '@docksite/db';
import { ownLinks, ownLink, clicks, insertLink } from '@docksite/db/repositories/short-links';
import { recordEvent } from '@docksite/db/repositories/analytics';
import { parse, idSchema, futureDate } from '@docksite/utils/validation';
import { codeSchema, linkSchema, destinationUrl } from '@docksite/utils/security';
import { HttpError } from '@docksite/utils/http';

function owned(req) {
  const link = ownLink(parse(idSchema, req.params.id), req.user.id);
  if (!link || link.tool_id !== req.tool.id) throw new HttpError(404, 'Link not found.');
  return link;
}
const shortUrl = (res, code) => `${res.locals.appOrigin}${res.locals.basePath}/${code}`;
export function index(req, res) {
  const links = req.user
    ? ownLinks(req.user.id).filter((link) => link.tool_id === req.tool.id)
    : [];
  res.render('index', {
    title: req.tool.name,
    tool: req.tool,
    links,
    shortUrl: (code) => shortUrl(res, code),
  });
}
export const newPage = (req, res) => res.render('form', { title: 'Create short link', link: null });
export const editPage = (req, res) =>
  res.render('form', { title: 'Edit short link', link: owned(req) });
export function detail(req, res) {
  const link = owned(req);
  res.render('show', {
    title: 'Short link',
    link,
    clicks: clicks(link.id),
    shortUrl: shortUrl(res, link.code),
  });
}
export async function create(req, res) {
  const data = parse(linkSchema, req.body);
  data.destination_url = destinationUrl(data.destination_url, req.tool);
  data.expires_at = futureDate(data.expires_at);
  data.password_hash = data.password ? await bcrypt.hash(data.password, 12) : null;
  let id;
  if (data.alias)
    id = insertLink({ ...data, code: parse(codeSchema, data.alias) }, req.user.id, req.tool.id);
  else {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        id = insertLink(
          { ...data, code: randomBytes(6).toString('base64url').toLowerCase() },
          req.user.id,
          req.tool.id,
        );
        break;
      } catch (error) {
        if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE' || attempt === 4) throw error;
      }
    }
  }
  res.redirect(`${res.locals.basePath}/links/${id}`);
}
export async function update(req, res) {
  const link = owned(req);
  const data = parse(linkSchema, req.body);
  const destination = destinationUrl(data.destination_url, req.tool);
  const expiry = futureDate(data.expires_at);
  const passwordHash = data.remove_password
    ? null
    : data.password
      ? await bcrypt.hash(data.password, 12)
      : link.password_hash;
  db.prepare(
    'UPDATE short_links SET destination_url=?, password_hash=?, expires_at=?, click_limit=?, is_active=?, updated_at=? WHERE id=? AND user_id=? AND deleted_at IS NULL',
  ).run(
    destination,
    passwordHash,
    expiry,
    data.click_limit,
    data.is_active ? 1 : 0,
    now(),
    link.id,
    req.user.id,
  );
  res.redirect(`${res.locals.basePath}/links/${link.id}`);
}
export function disable(req, res) {
  const link = owned(req);
  db.prepare('UPDATE short_links SET is_active=0, updated_at=? WHERE id=?').run(now(), link.id);
  res.redirect(`${res.locals.basePath}/dashboard`);
}
export function remove(req, res) {
  const link = owned(req);
  db.prepare('UPDATE short_links SET is_active=0, deleted_at=?, updated_at=? WHERE id=?').run(
    now(),
    now(),
    link.id,
  );
  res.redirect(`${res.locals.basePath}/dashboard`);
}
export async function qr(req, res) {
  const link = owned(req);
  const buffer = await QRCode.toBuffer(shortUrl(res, link.code), {
    type: 'png',
    width: 360,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
  res.set('Cache-Control', 'private, no-store').type('png').send(buffer);
}
export function share(req, res) {
  const link = owned(req);
  recordEvent(req.tool.id, req.user.id, 'share', { short_link_id: link.id, action: 'copy' });
  res.sendStatus(204);
}
