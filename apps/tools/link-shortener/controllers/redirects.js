import bcrypt from 'bcrypt';
import { z } from 'zod';
import { createHmac } from 'node:crypto';
import { config } from '@docksite/config';
import { now } from '@docksite/db';
import { publicLink, consumeClick } from '@docksite/db/repositories/short-links';
import { saveSession } from '@docksite/auth';
import { parse } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';

function available(req) {
  const code = z
    .string()
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .safeParse(req.params.code);
  if (!code.success) throw new HttpError(404, 'Short link not found.');
  const link = publicLink(code.data, req.tool.id);
  if (!link) throw new HttpError(404, 'Short link not found.');
  if (
    !link.is_active ||
    (link.expires_at && link.expires_at <= now()) ||
    (link.click_limit && link.click_count >= link.click_limit)
  )
    throw new HttpError(
      410,
      'This short link is disabled, expired, or has reached its click limit.',
    );
  return link;
}
export async function unlock(req, res) {
  const link = available(req);
  if (!link.password_hash) return res.redirect(`${res.locals.basePath}/${link.code}`);
  const password = parse(
    z
      .string()
      .min(1)
      .max(72)
      .refine(
        (value) => Buffer.byteLength(value, 'utf8') <= 72,
        'Password must be at most 72 UTF-8 bytes.',
      ),
    req.body.password,
  );
  if (!(await bcrypt.compare(password, link.password_hash)))
    throw new HttpError(401, 'The link password is incorrect.');
  req.session.linkUnlocks ||= {};
  const entries = Object.entries(req.session.linkUnlocks).slice(-19);
  req.session.linkUnlocks = Object.fromEntries(entries);
  req.session.linkUnlocks[link.id] = { hash: link.password_hash, expires: Date.now() + 900000 };
  await saveSession(req);
  res.redirect(`${res.locals.basePath}/${link.code}`);
}
export function redirect(req, res) {
  const link = available(req);
  const grant = req.session.linkUnlocks?.[link.id];
  res.set('Cache-Control', 'no-store');
  if (
    link.password_hash &&
    (!grant || grant.hash !== link.password_hash || grant.expires <= Date.now())
  )
    return res.render('unlock', { title: 'Password protected link', code: link.code });
  if (req.method === 'HEAD') return res.redirect(302, link.destination_url);
  let referrer = null;
  try {
    if (req.get('referer')) referrer = new URL(req.get('referer')).origin.slice(0, 300);
  } catch {
    referrer = null;
  }
  const destination = consumeClick(link, req.user?.id || null, {
    ipHash: createHmac('sha256', config.ANALYTICS_HASH_SECRET)
      .update(`${now().slice(0, 10)}|${req.ip}`)
      .digest('hex'),
    userAgent: req.get('user-agent')?.slice(0, 200) || null,
    referrer,
  });
  if (!destination) throw new HttpError(410, 'This link is no longer available.');
  res.redirect(302, destination);
}
