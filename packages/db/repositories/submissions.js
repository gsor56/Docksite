import { db, now } from '../index.js';
import { config } from '@docksite/config';
import { cmsUrl } from '@docksite/config/urls';
import { saveTool, toolById } from './tools.js';
import { recordActivity } from './activity.js';
import { grantDeveloperAccess } from './users.js';
import { assertExternalProject } from '@docksite/utils/project-urls';
import { HttpError } from '@docksite/utils/http';
import { subdomainSchema } from '@docksite/utils/validation';

function projectHandle(title) {
  const normalized = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 36)
    .replace(/-+$/, '');
  const stem = normalized.length >= 2 ? normalized : 'project';
  const existing = db.prepare('SELECT 1 FROM tools WHERE slug=? OR subdomain=?');
  let handle = stem;
  for (
    let suffix = 2;
    !subdomainSchema.safeParse(handle).success || existing.get(handle, handle);
    suffix++
  )
    handle = stem + '-' + suffix;
  return handle;
}

function saveDecision(id, status, note, actorId, toolId) {
  db.prepare(
    'UPDATE tool_submissions SET status=?,reviewed_by=?,review_note=?,tool_id=?,updated_at=? WHERE id=?',
  ).run(status, actorId, note, toolId, now(), id);
  recordActivity(actorId, 'submission.review', 'submission', id, {
    status,
    tool_id: toolId,
  });
}

function queueReview(id) {
  const submission = db
    .prepare(
      'SELECT s.*, u.username FROM tool_submissions s JOIN users u ON u.id=s.submitted_by WHERE s.id=?',
    )
    .get(id);
  const recipient =
    config.REVIEW_EMAIL ||
    db.prepare("SELECT email FROM users WHERE role='owner' AND is_active=1").get()?.email;
  if (!recipient) throw new HttpError(503, 'A review recipient must be configured.');
  const timestamp = now();
  db.prepare(
    'INSERT INTO email_outbox (submission_id,recipient,subject,body,next_attempt_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
  ).run(
    id,
    recipient,
    'Docksite project review: ' + submission.title,
    [
      'Submitted by: ' + submission.username,
      'Project: ' + (submission.project_url || 'Idea only'),
      'Repository: ' + (submission.repository_url || 'Not supplied'),
      '',
      submission.idea,
      '',
      'Review privately: ' + cmsUrl('/submissions'),
    ].join('\n'),
    timestamp,
    timestamp,
    timestamp,
  );
}

export function submitProject(data, actor, toolId = null) {
  return db.transaction(() => {
    assertExternalProject(data.project_url);
    if (
      data.category_id &&
      !db.prepare('SELECT id FROM categories WHERE id=?').get(data.category_id)
    )
      throw new HttpError(422, 'Category not found.');
    const existing = toolId
      ? db.prepare('SELECT * FROM tool_submissions WHERE tool_id=?').get(toolId)
      : null;
    const timestamp = now();
    let id = existing?.id;
    if (id) {
      db.prepare(
        "UPDATE tool_submissions SET title=?,idea=?,category_id=?,project_url=?,repository_url=?,status='pending',reviewed_by=NULL,review_note=NULL,updated_at=? WHERE id=?",
      ).run(
        data.title,
        data.idea,
        data.category_id,
        data.project_url,
        data.repository_url,
        timestamp,
        id,
      );
      db.prepare(
        "DELETE FROM email_outbox WHERE submission_id=? AND status IN ('pending','failed')",
      ).run(id);
    } else {
      const toolOwner = toolId
        ? db.prepare('SELECT owner_id FROM tools WHERE id=?').get(toolId)?.owner_id
        : null;
      id = Number(
        db
          .prepare(
            'INSERT INTO tool_submissions (title,idea,category_id,submitted_by,project_url,repository_url,tool_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
          )
          .run(
            data.title,
            data.idea,
            data.category_id,
            toolOwner ?? actor.id,
            data.project_url || null,
            data.repository_url || null,
            toolId,
            timestamp,
            timestamp,
          ).lastInsertRowid,
      );
    }
    queueReview(id);
    recordActivity(actor.id, 'submission.create', 'submission', id);
    return id;
  })();
}

export function withdrawToolSubmission(id) {
  const submission = db
    .prepare("SELECT id FROM tool_submissions WHERE tool_id=? AND status='pending'")
    .get(id);
  if (!submission) return;
  db.prepare(
    "UPDATE tool_submissions SET status='rejected',review_note='Withdrawn from review.',updated_at=? WHERE id=?",
  ).run(now(), submission.id);
  db.prepare(
    "DELETE FROM email_outbox WHERE submission_id=? AND status IN ('pending','failed')",
  ).run(submission.id);
}

export function syncToolSubmission(id, actor) {
  const tool = toolById(id);
  if (tool.status !== 'pending') {
    const approved =
      actor.role === 'owner' && tool.status === 'published' && tool.approved_url
        ? db
            .prepare(
              "SELECT id FROM tool_submissions WHERE tool_id=? AND status='pending' AND project_url=?",
            )
            .get(id, tool.approved_url)
        : null;
    if (approved) saveDecision(approved.id, 'approved', '', actor.id, id);
    else withdrawToolSubmission(id);
    return;
  }
  submitProject(
    {
      title: tool.name,
      idea: tool.description,
      category_id: tool.category_id,
      project_url: tool.external_url,
      repository_url: tool.repository_url,
    },
    actor,
    id,
  );
}

export const submissionsList = () =>
  db
    .prepare(
      'SELECT s.*, u.username, (SELECT status FROM email_outbox e WHERE e.submission_id=s.id ORDER BY e.id DESC LIMIT 1) AS email_status FROM tool_submissions s JOIN users u ON u.id=s.submitted_by ORDER BY s.id DESC',
    )
    .all();

export const submissionsByUser = (id) =>
  db
    .prepare(
      'SELECT s.*, t.status AS tool_status FROM tool_submissions s LEFT JOIN tools t ON t.id=s.tool_id AND t.owner_id=s.submitted_by WHERE s.submitted_by=? ORDER BY s.id DESC',
    )
    .all(id);

export function reviewSubmission(id, data, actor) {
  if (actor.role !== 'owner') throw new HttpError(403, 'Only the owner can approve projects.');
  return db
    .transaction(() => {
      const submission = db.prepare('SELECT * FROM tool_submissions WHERE id=?').get(id);
      if (!submission) throw new HttpError(404, 'Submission not found.');
      let toolId = submission.tool_id;
      if (data.status === 'approved') {
        if (submission.status !== 'pending')
          throw new HttpError(409, 'Only pending submissions can be approved.');
        if ((submission.project_url || '') !== data.project_url)
          throw new HttpError(
            409,
            'The project URL changed. Reload the submission before approving.',
          );
        assertExternalProject(submission.project_url);
        if (toolId) {
          const tool = toolById(toolId);
          if (!tool || tool.status !== 'pending' || tool.external_url !== submission.project_url)
            throw new HttpError(
              409,
              'The pending tool changed. Ask the developer to submit it again.',
            );
          db.prepare("UPDATE tools SET status='draft',approved_url=?,updated_at=? WHERE id=?").run(
            submission.project_url,
            now(),
            toolId,
          );
        } else if (submission.project_url) {
          const slug = projectHandle(submission.title);
          toolId = saveTool(
            {
              slug,
              subdomain: slug,
              name: submission.title.slice(0, 100),
              tagline: submission.idea.replace(/\s+/g, ' ').slice(0, 180),
              description: submission.idea,
              category_id: submission.category_id,
              module_key: null,
              status: 'draft',
              featured: false,
              icon: 'code',
              tags: [],
              external_url: submission.project_url,
              repository_url: submission.repository_url,
            },
            actor,
          );
          db.prepare('UPDATE tools SET owner_id=?,approved_url=? WHERE id=?').run(
            submission.submitted_by,
            submission.project_url,
            toolId,
          );
        }
        if (submission.project_url) grantDeveloperAccess(submission.submitted_by);
      } else if (toolId) {
        db.prepare(
          "UPDATE tools SET status='draft',featured=0,approved_url=NULL,updated_at=? WHERE id=?",
        ).run(now(), toolId);
      }
      saveDecision(id, data.status, data.review_note, actor.id, toolId);
    })
    .immediate();
}
