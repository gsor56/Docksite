import { db } from '@docksite/db';

export function dashboard(req, res) {
  const own = req.user.role === 'contributor';
  const counts = {
    tools: db
      .prepare(`SELECT COUNT(*) AS count FROM tools ${own ? 'WHERE owner_id = ?' : ''}`)
      .get(...(own ? [req.user.id] : [])).count,
    media: db
      .prepare(`SELECT COUNT(*) AS count FROM media ${own ? 'WHERE owner_id = ?' : ''}`)
      .get(...(own ? [req.user.id] : [])).count,
    submissions: own
      ? null
      : db.prepare("SELECT COUNT(*) AS count FROM tool_submissions WHERE status = 'pending'").get()
          .count,
    users: own ? null : db.prepare('SELECT COUNT(*) AS count FROM users').get().count,
  };
  res.render('dashboard', { title: 'CMS dashboard', counts });
}
