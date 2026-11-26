import { z } from 'zod';
import { slugSchema, webUrlSchema } from './validation.js';

export const releaseSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(160),
  version: z.string().trim().max(50).default(''),
  summary: z.string().trim().min(10).max(500),
  body: z.string().trim().min(20).max(30000),
  status: z.enum(['draft', 'published']),
});
export const reportSchema = z.object({
  resource_url: webUrlSchema,
  reason: z.enum([
    'phishing',
    'spam',
    'malware',
    'harassment',
    'copyright',
    'illegal-content',
    'other',
  ]),
  description: z.string().trim().min(20).max(5000),
  reporter_email: z.union([z.literal(''), z.email().trim().toLowerCase().max(254)]).default(''),
});
export const reportReviewSchema = z.object({
  status: z.enum(['open', 'in-review', 'resolved', 'dismissed']),
  review_note: z.string().trim().max(2000).default(''),
});
