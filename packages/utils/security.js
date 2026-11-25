import { z } from 'zod';
import { config } from '@docksite/config';
import { platformUrl, origin } from '@docksite/config/urls';
import { HttpError } from './http.js';
import { passwordSchema, optionalId, checkbox } from './validation.js';

export const codeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9_-]+$/)
  .refine(
    (value) =>
      ![
        'login',
        'logout',
        'register',
        'dashboard',
        'links',
        'assets',
        'api',
        'setup',
        'robots',
        'sitemap',
        'favicon',
      ].includes(value),
    'This alias is reserved.',
  );
export const linkSchema = z.object({
  destination_url: z.string().trim().min(1).max(4096),
  alias: z.string().trim().max(40).default(''),
  expires_at: z.string().max(50).default(''),
  password: z.union([z.literal(''), passwordSchema]).default(''),
  remove_password: checkbox,
  click_limit: optionalId,
  is_active: checkbox,
});
export function destinationUrl(value, tool) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(422, 'Enter an absolute HTTP or HTTPS destination URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname)
    throw new HttpError(422, 'Only HTTP and HTTPS URLs without embedded credentials are allowed.');
  const ownOrigin = origin('link', tool.subdomain);
  if (
    url.origin === ownOrigin ||
    (url.origin === new URL(platformUrl('/')).origin &&
      url.pathname.startsWith(`/t/${tool.subdomain}/`)) ||
    url.hostname === `${tool.subdomain}.${config.BASE_DOMAIN}`
  )
    throw new HttpError(422, 'A short link cannot point back into this shortener.');
  return url.href;
}
