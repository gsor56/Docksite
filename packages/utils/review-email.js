import nodemailer from 'nodemailer';
import { config } from '@docksite/config';
import { db, now } from '@docksite/db';

export const emailReady = () =>
  Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASSWORD && config.SMTP_FROM);
export async function dispatchReviewEmails(transport = null) {
  if (!transport && !emailReady()) return { configured: false, sent: 0, failed: 0 };
  const mailer =
    transport ||
    nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      requireTLS: !config.SMTP_SECURE,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  const stale = new Date(Date.now() - 120000).toISOString();
  db.prepare(
    "UPDATE email_outbox SET status='pending' WHERE status='sending' AND updated_at<?",
  ).run(stale);
  const ids = db
    .prepare(
      "SELECT id FROM email_outbox WHERE status IN ('pending','failed') AND next_attempt_at<=? ORDER BY id LIMIT 10",
    )
    .all(now());
  let sent = 0,
    failed = 0;
  for (const { id } of ids) {
    const row = db.transaction(() => {
      if (
        !db
          .prepare(
            "UPDATE email_outbox SET status='sending',attempts=attempts+1,updated_at=? WHERE id=? AND status IN ('pending','failed')",
          )
          .run(now(), id).changes
      )
        return null;
      return db.prepare('SELECT * FROM email_outbox WHERE id=?').get(id);
    })();
    if (!row) continue;
    try {
      const result = await mailer.sendMail({
        from: config.SMTP_FROM,
        to: row.recipient,
        subject: row.subject,
        text: row.body,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (!result.accepted?.length) throw new Error('Recipient was not accepted.');
      db.prepare(
        "UPDATE email_outbox SET status='sent',sent_at=?,last_error=NULL,updated_at=? WHERE id=?",
      ).run(now(), now(), id);
      sent++;
    } catch {
      const retry = new Date(
        Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(row.attempts, 6)),
      ).toISOString();
      db.prepare(
        "UPDATE email_outbox SET status='failed',last_error='SMTP delivery failed; check configuration and retry.',next_attempt_at=?,updated_at=? WHERE id=?",
      ).run(retry, now(), id);
      failed++;
    }
  }
  return { configured: true, sent, failed };
}
export function startReviewEmailWorker() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await dispatchReviewEmails();
    } catch {
      console.error('Review email queue could not be processed.');
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(run, 30000);
  timer.unref();
  return timer;
}
