import { z } from 'zod';
import { db, now } from '@docksite/db';
import { recordActivity } from '@docksite/db/repositories/activity';
import { parse, idSchema } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';

export const index = (req, res) =>
  res.render('submissions', {
    title: 'Submissions',
    submissions: db
      .prepare(
        'SELECT s.*, u.username FROM tool_submissions s JOIN users u ON u.id = s.submitted_by ORDER BY s.id DESC',
      )
      .all(),
  });
export function review(req, res) {
  const id = parse(idSchema, req.params.id);
  const data = parse(
    z.object({
      status: z.enum(['approved', 'rejected']),
      review_note: z.string().trim().max(2000).default(''),
    }),
    req.body,
  );
  db.transaction(() => {
    if (
      !db
        .prepare(
          'UPDATE tool_submissions SET status=?, reviewed_by=?, review_note=?, updated_at=? WHERE id=?',
        )
        .run(data.status, req.user.id, data.review_note, now(), id).changes
    )
      throw new HttpError(404, 'Submission not found.');
    recordActivity(req.user.id, 'submission.review', 'submission', id, { status: data.status });
  })();
  res.redirect(`${res.locals.basePath}/submissions`);
}
