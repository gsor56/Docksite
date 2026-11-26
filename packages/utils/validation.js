import { z } from 'zod';
import { HttpError } from './http.js';

export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new HttpError(
      422,
      result.error.issues
        .map((issue) => `${issue.path.join('.') || 'Input'}: ${issue.message}`)
        .join(' '),
    );
  return result.data;
}
export const idSchema = z.coerce.number().int().positive();
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const subdomainSchema = slugSchema
  .max(50)
  .refine(
    (value) => !['cms', 'www', 'api', 'mail', 'assets'].includes(value),
    'Reserved subdomain.',
  );
export const optionalId = z.preprocess(
  (value) => (value === '' || value == null ? null : value),
  idSchema.nullable(),
);
export const checkbox = z.preprocess(
  (value) => value === 'on' || value === '1' || value === true,
  z.boolean(),
);
export const passwordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must be at most 72 UTF-8 bytes.',
  );
export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  email: z.email().trim().toLowerCase().max(254),
  password: passwordSchema,
  account_type: z.enum(['user', 'contributor']).default('user'),
});
export const loginSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z
    .string()
    .min(1)
    .max(72)
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'Password must be at most 72 UTF-8 bytes.',
    ),
});
export const directorySchema = z.object({
  search: z.string().trim().max(200).default(''),
  category: z.string().max(60).default(''),
  tag: z.string().max(60).default(''),
  sort: z.enum(['newest', 'name', 'popular']).default('newest'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export const webUrlSchema = z
  .string()
  .trim()
  .max(4096)
  .transform((value, context) => {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw new Error();
      return url.href;
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'Enter an absolute HTTP or HTTPS URL without credentials.',
      });
      return z.NEVER;
    }
  });
export const optionalWebUrl = z.preprocess(
  (value) => (value === '' || value == null ? null : value),
  webUrlSchema.nullable(),
);
export const toolSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(100),
  tagline: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(12000),
  category_id: optionalId,
  subdomain: subdomainSchema,
  module_key: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.literal('link-shortener').nullable(),
  ),
  external_url: optionalWebUrl,
  repository_url: optionalWebUrl,
  status: z.enum(['draft', 'pending', 'published', 'archived']),
  featured: checkbox,
  icon: z.enum(['link', 'box', 'code']).default('link'),
  tags: z.preprocess(
    (value) => (value == null ? [] : Array.isArray(value) ? value : [value]),
    z.array(idSchema).max(30),
  ),
});
export const submissionSchema = z.object({
  title: z.string().trim().min(3).max(120),
  idea: z.string().trim().min(20).max(5000),
  project_url: optionalWebUrl,
  repository_url: optionalWebUrl,
  category_id: optionalId,
});
export const taxonomySchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).default(''),
});
export function futureDate(value) {
  if (!value) return null;
  if (
    typeof value !== 'string' ||
    value.length > 50 ||
    !z.iso.datetime({ offset: true, local: true }).safeParse(value).success
  )
    throw new HttpError(422, 'Expiry must be an ISO date and time.');
  const date = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
    throw new HttpError(422, 'Expiry must be a valid future date.');
  return date.toISOString();
}
