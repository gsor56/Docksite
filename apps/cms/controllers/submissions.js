import { z } from 'zod';
import { submissionsList, reviewSubmission } from '@docksite/db/repositories/submissions';
import { emailReady, dispatchReviewEmails } from '@docksite/utils/review-email';
import { parse, idSchema } from '@docksite/utils/validation';

export const index = (req, res) =>
  res.render('submissions', {
    title: 'Submissions',
    submissions: submissionsList(),
    emailConfigured: emailReady(),
  });
export function review(req, res) {
  const data = parse(
    z.object({
      status: z.enum(['approved', 'rejected']),
      review_note: z.string().trim().max(2000).default(''),
    }),
    req.body,
  );
  reviewSubmission(parse(idSchema, req.params.id), data, req.user);
  res.redirect(res.locals.basePath + '/submissions');
}
export async function sendNotifications(req, res) {
  const result = await dispatchReviewEmails();
  req.session.flash = result.configured
    ? 'Queue processed: ' + result.sent + ' accepted, ' + result.failed + ' failed.'
    : 'SMTP is not configured. Notifications remain queued.';
  res.redirect(res.locals.basePath + '/submissions');
}
