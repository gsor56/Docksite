import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { z } from 'zod';

export const rootPath = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: resolve(rootPath, '.env'), quiet: true });

const integer = (fallback, maximum = 2147483647) =>
  z.coerce.number().int().min(1).max(maximum).default(fallback);
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BASE_DOMAIN: z
    .string()
    .regex(/^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+)$/i)
    .default('localhost'),
  URL_SCHEME: z.enum(['http', 'https']).default('http'),
  URL_MODE: z.enum(['path', 'subdomain']).default('path'),
  PORT: integer(3000, 65535),
  CMS_PORT: integer(3001, 65535),
  LINK_PORT: integer(3002, 65535),
  DATABASE_PATH: z.string().default('./storage/database.sqlite'),
  UPLOAD_DIR: z.string().default('./storage/uploads'),
  UPLOAD_MAX_BYTES: integer(5242880, 20971520),
  SESSION_SECRET: z.string().min(32),
  CMS_SESSION_SECRET: z.string().min(32),
  SESSION_TTL_SECONDS: integer(604800),
  TRUST_PROXY: z.coerce.number().int().min(0).max(1).default(0),
  INITIAL_PLATFORM_NAME: z.string().trim().min(1).max(80).default('Docksite'),
  OWNER_USERNAME: z.string().default(''),
  OWNER_EMAIL: z.string().default(''),
  REVIEW_EMAIL: z.union([z.literal(''), z.email()]).default(''),
  CONTACT_EMAIL: z.union([z.literal(''), z.email()]).default(''),
  REPOSITORY_URL: z
    .union([z.literal(''), z.url().refine((value) => value.startsWith('https://'))])
    .default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: integer(465, 65535),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.union([z.literal(''), z.email()]).default(''),
  OWNER_PASSWORD: z.string().default(''),
  SETUP_TOKEN: z.string().default(''),
  ANALYTICS_HASH_SECRET: z.string().min(32),
  ANALYTICS_RETENTION_DAYS: integer(90),
  AUTH_RATE_WINDOW_SECONDS: integer(900),
  LOGIN_RATE_MAX: integer(10),
  REGISTER_RATE_MAX: integer(5),
  SUBMISSION_RATE_MAX: integer(10),
  LINK_CREATE_RATE_MAX: integer(30),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}. See .env.example.`,
  );
}
export const config = parsed.data;
config.BASE_DOMAIN = config.BASE_DOMAIN.toLowerCase();
config.DATABASE_PATH = resolve(rootPath, config.DATABASE_PATH);
config.UPLOAD_DIR = resolve(rootPath, config.UPLOAD_DIR);
if (config.NODE_ENV === 'production' && config.URL_SCHEME !== 'https') {
  throw new Error('Production requires URL_SCHEME=https.');
}
if (config.SESSION_SECRET === config.CMS_SESSION_SECRET) {
  throw new Error('Platform and CMS must have different session secrets.');
}
