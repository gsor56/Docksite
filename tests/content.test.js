import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import nodemailer from 'nodemailer';
import { prepareEnvironment, Client } from './helpers.js';

let environment, db, config, publicClient, owner, volunteer, admin, submissionId;
const servers = [];
const password = 'project-test-password-123';
before(async () => {
  environment = await prepareEnvironment();
  ({ db } = await import('@docksite/db'));
  const { migrate } = await import('@docksite/db');
  migrate();
  ({ config } = await import('@docksite/config'));
  const { createPlatformApp } = await import('../apps/platform/app.js');
  const { createCmsApp } = await import('../apps/cms/app.js');
  for (const [app, port] of [
    [createPlatformApp(), config.PORT],
    [createCmsApp(), config.CMS_PORT],
  ]) {
    const server = app.listen(port, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    servers.push(server);
  }
  publicClient = new Client('http://localhost:' + config.PORT);
  owner = new Client('http://localhost:' + config.CMS_PORT);
  await owner.post(
    '/setup',
    {
      setup_token: config.SETUP_TOKEN,
      username: 'reviewer',
      email: 'reviewer@localhost.test',
      password,
    },
    '/setup',
  );
  volunteer = new Client(publicClient.base);
  assert.equal(
    (
      await volunteer.post('/register', {
        username: 'volunteer',
        email: 'volunteer@localhost.test',
        password,
        account_type: 'contributor',
        role: 'owner',
      })
    ).status,
    302,
  );
  admin = new Client(owner.base);
  await admin.post('/register', {
    username: 'staffer',
    email: 'staffer@localhost.test',
    password,
    role: 'owner',
  });
  const staff = db.prepare("SELECT id FROM users WHERE username='staffer'").get();
  await owner.post('/users/' + staff.id, { role: 'admin', is_active: 'on' });
});
after(async () => {
  for (const server of servers)
    await new Promise((resolve) => {
      server.closeAllConnections();
      server.close(resolve);
    });
  db?.close();
  await environment?.cleanup();
});

test('all information routes, help articles, metadata and footer links resolve', async () => {
  const { informationPages, helpArticles, docArticles } =
    await import('../apps/platform/content/catalog.js');
  const pages = informationPages();
  for (const url of [
    ...Object.keys(pages),
    '/help',
    '/docs',
    '/changelog',
    '/report-abuse',
    ...Object.keys(helpArticles).map((slug) => '/help/' + slug),
    ...Object.keys(docArticles).map((slug) => '/docs/' + slug),
  ]) {
    const response = await publicClient.request(url);
    assert.equal(response.status, 200, url);
    const html = await response.text();
    assert.match(html, /<h1>/, url);
    assert(html.includes('rel="canonical"'), url);
    if (['coming-soon', 'draft'].includes(pages[url]?.state)) {
      assert.match(html, /name="robots" content="noindex, follow"/, url);
      assert.match(html, pages[url].state === 'draft' ? /Draft.*review/ : /Coming soon/, url);
    }
  }
  const homepage = await (await publicClient.request('/')).text();
  const footer = homepage.slice(homepage.indexOf('<footer'));
  for (const href of new Set([...footer.matchAll(/href="([^"]+)"/g)].map((match) => match[1]))) {
    assert.equal((await publicClient.request(new URL(href).pathname)).status, 200, href);
  }
  const sitemap = await (await publicClient.request('/sitemap.xml')).text();
  for (const [url, page] of Object.entries(pages)) {
    assert.equal(
      sitemap.includes('<loc>' + publicClient.base + url + '</loc>'),
      page.state === 'informational',
      url,
    );
  }
  assert(!sitemap.includes('/dashboard'));
  assert.match(
    await (await publicClient.request('/changelog')).text(),
    /No releases published yet/,
  );
  assert.equal((await publicClient.request('/help/unknown')).status, 404);
  assert.equal((await publicClient.request('/docs/unknown')).status, 404);
});

test('project submissions stay private and require owner publication', async () => {
  assert.equal(
    db.prepare("SELECT role FROM users WHERE username='volunteer'").get().role,
    'contributor',
  );
  const escalation = new Client(publicClient.base);
  assert.equal(
    (
      await escalation.post('/register', {
        username: 'escalate',
        email: 'escalate@localhost.test',
        password,
        account_type: 'owner',
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await volunteer.post('/build', {
        title: 'Unsafe project',
        idea: 'A description with enough characters to validate.',
        project_url: 'javascript:alert(1)',
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await volunteer.post('/build', {
        title: 'Real submitted project',
        idea: 'A working independently hosted project submitted for review.',
        project_url: 'http://127.0.0.1:1/project',
        repository_url: 'http://127.0.0.1:1/repository',
      })
    ).status,
    302,
  );
  const submission = db.prepare('SELECT * FROM tool_submissions').get();
  submissionId = submission.id;
  assert.equal(submission.status, 'pending');
  assert.equal((await (await publicClient.request('/api/tools')).json()).total, 0);
  assert.equal(
    db.prepare('SELECT recipient FROM email_outbox').get().recipient,
    'review@localhost.test',
  );
  assert.equal(
    (await admin.post('/submissions/' + submissionId + '/review', { status: 'approved' })).status,
    403,
  );
  assert.equal(
    (
      await owner.post('/submissions/' + submissionId + '/review', {
        status: 'approved',
        review_note: 'Reviewed working destination.',
      })
    ).status,
    302,
  );
  const tool = db.prepare('SELECT * FROM tools').get();
  assert.equal(tool.status, 'published');
  assert.equal(tool.owner_id, submission.submitted_by);
  const api = await (await publicClient.request('/api/tools/' + tool.slug)).json();
  assert.equal(api.url, 'http://127.0.0.1:1/project');
  assert.equal(
    (await publicClient.request('/t/' + tool.subdomain)).headers.get('location'),
    api.url,
  );
  const landing = await (await publicClient.request('/tools/' + tool.slug)).text();
  assert(landing.includes(api.url));
  assert.equal(
    (
      await owner.post('/submissions/' + submissionId + '/review', {
        status: 'rejected',
        review_note: 'Withdrawn after review.',
      })
    ).status,
    302,
  );
  assert.equal((await publicClient.request('/api/tools/' + tool.slug)).status, 404);
});

test('CMS contributors can submit their own external project but cannot publish or inspect staff inboxes', async () => {
  const contributor = new Client(owner.base);
  assert.equal(
    (await contributor.post('/login', { email: 'volunteer@localhost.test', password })).status,
    302,
  );
  const data = {
    slug: 'volunteer-tool',
    name: 'Volunteer tool',
    tagline: 'An independently hosted project',
    description: 'A working project with a real destination for manual review.',
    subdomain: 'volunteer-tool',
    external_url: 'http://127.0.0.1:1/second-project',
    status: 'pending',
  };
  assert.equal((await contributor.post('/tools', data)).status, 302);
  const tool = db.prepare("SELECT * FROM tools WHERE slug='volunteer-tool'").get();
  const submission = db.prepare('SELECT * FROM tool_submissions WHERE tool_id=?').get(tool.id);
  assert.equal(submission.status, 'pending');
  assert.equal(
    (await contributor.post('/tools/' + tool.id, { ...data, status: 'published' })).status,
    403,
  );
  for (const url of ['/submissions', '/reports', '/releases', '/users', '/settings'])
    assert.equal((await contributor.request(url)).status, 403, url);
  assert.equal(
    (await owner.post('/submissions/' + submission.id + '/review', { status: 'approved' })).status,
    302,
  );
  assert.equal(db.prepare('SELECT status FROM tools WHERE id=?').get(tool.id).status, 'published');
  assert.equal(
    (await admin.post('/tools/' + tool.id, { ...data, status: 'published' })).status,
    403,
  );
});

test('release drafts are private, publication is real, and bodies are escaped', async () => {
  const data = {
    slug: 'verified-release',
    title: 'Verified release note',
    version: 'test',
    summary: 'An isolated release note for publication verification.',
    body: 'Actual isolated test content <script>alert(1)</script>.',
    status: 'draft',
  };
  assert.equal((await owner.post('/releases', data)).status, 302);
  const release = db.prepare('SELECT * FROM releases').get();
  assert.equal((await publicClient.request('/changelog/' + data.slug)).status, 404);
  assert(
    !(await (await publicClient.request('/sitemap.xml')).text()).includes(
      '/changelog/' + data.slug,
    ),
  );
  assert.equal(
    (await owner.post('/releases/' + release.id, { ...data, status: 'published' })).status,
    302,
  );
  const response = await publicClient.request('/changelog/' + data.slug);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert(html.includes('&lt;script&gt;'));
  assert(!html.includes('<script>alert(1)</script>'));
  assert(db.prepare('SELECT published_at FROM releases').get().published_at);
  assert(
    (await (await publicClient.request('/sitemap.xml')).text()).includes('/changelog/' + data.slug),
  );
  assert.equal(
    (await owner.post('/releases/' + release.id, { ...data, status: 'draft' })).status,
    302,
  );
  assert.equal((await publicClient.request('/changelog/' + data.slug)).status, 404);
  assert.equal((await publicClient.request('/changelog/not-a-release')).status, 404);
});

test('abuse reports validate, persist, remain private and log staff review', async () => {
  assert.equal(
    (
      await publicClient.request('/report-abuse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          resource_url: 'http://127.0.0.1:1/report',
          reason: 'spam',
          description: 'A meaningful report description.',
        }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await publicClient.post(
        '/report-abuse',
        {
          resource_url: 'javascript:alert(1)',
          reason: 'spam',
          description: 'A meaningful report description.',
        },
        '/report-abuse',
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await publicClient.post(
        '/report-abuse',
        {
          resource_url: 'http://127.0.0.1:1/reported',
          reason: 'phishing',
          description: 'A suspicious credential collection page.',
          reporter_email: 'reporter@localhost.test',
        },
        '/report-abuse',
      )
    ).status,
    201,
  );
  const report = db.prepare('SELECT * FROM abuse_reports').get();
  assert.equal(report.status, 'open');
  assert.equal(report.reporter_email, 'reporter@localhost.test');
  assert.equal((await publicClient.request('/reports/' + report.id)).status, 404);
  assert.equal((await new Client(owner.base).request('/reports')).status, 302);
  assert.equal((await admin.request('/reports/' + report.id)).status, 200);
  assert.equal(
    (
      await admin.post('/reports/' + report.id + '/review', {
        status: 'in-review',
        review_note: 'Investigating manually.',
      })
    ).status,
    302,
  );
  assert.equal(db.prepare('SELECT status FROM abuse_reports').get().status, 'in-review');
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM activity_log WHERE action='report.review'").get()
      .count,
    1,
  );
  assert(
    !(await (await publicClient.request('/api/tools')).text()).includes('reporter@localhost.test'),
  );
});

test('notifications remain queued without credentials and deliver over a real isolated SMTP connection', async () => {
  const { dispatchReviewEmails } = await import('@docksite/utils/review-email');
  const result = await dispatchReviewEmails();
  assert.equal(result.configured, false);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM email_outbox WHERE status='sent'").get().count,
    0,
  );
  let accepted = true;
  const messages = [];
  const smtp = createServer((socket) => {
    socket.write('220 localhost ESMTP\r\n');
    let buffer = '',
      dataMode = false,
      message = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (dataMode) {
          if (line === '.') {
            messages.push(message);
            message = '';
            dataMode = false;
            socket.write('250 queued\r\n');
          } else message += line + '\r\n';
        } else if (/^EHLO|^HELO/.test(line)) socket.write('250 localhost\r\n');
        else if (/^MAIL FROM/.test(line)) socket.write('250 sender ok\r\n');
        else if (/^RCPT TO/.test(line))
          socket.write(accepted ? '250 recipient ok\r\n' : '550 rejected\r\n');
        else if (line === 'DATA') {
          dataMode = true;
          socket.write('354 end with dot\r\n');
        } else if (line === 'QUIT') socket.end('221 bye\r\n');
        else socket.write('250 ok\r\n');
      }
    });
  });
  await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve));
  const transport = nodemailer.createTransport({
    host: '127.0.0.1',
    port: smtp.address().port,
    secure: false,
    ignoreTLS: true,
  });
  try {
    const delivery = await dispatchReviewEmails(transport);
    assert(delivery.sent > 0);
    assert.equal(messages.length, delivery.sent);
    assert(messages.some((message) => message.includes('project review')));
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM email_outbox WHERE status='sent' AND sent_at IS NOT NULL",
        )
        .get().count,
      delivery.sent,
    );
    db.prepare(
      "UPDATE email_outbox SET status='pending',next_attempt_at=? WHERE id=(SELECT MIN(id) FROM email_outbox)",
    ).run(new Date().toISOString());
    accepted = false;
    const failure = await dispatchReviewEmails(transport);
    assert.equal(failure.failed, 1);
    const failed = db.prepare("SELECT * FROM email_outbox WHERE status='failed'").get();
    assert(failed.last_error);
    assert(failed.next_attempt_at > new Date().toISOString());
  } finally {
    transport.close();
    await new Promise((resolve) => smtp.close(resolve));
  }
});

test('configured contact channels change page state without introducing a fake form', async () => {
  assert.equal(
    (
      await owner.post('/settings', {
        platform_name: 'Docksite',
        contact_email: 'contact@localhost.test',
        privacy_email: 'privacy@localhost.test',
        security_email: 'security@localhost.test',
        repository_url: 'https://github.com/gsor56/Docksite',
      })
    ).status,
    302,
  );
  const { informationPages } = await import('../apps/platform/content/catalog.js');
  assert.equal(informationPages()['/contact'].state, 'informational');
  assert.equal(informationPages()['/security'].state, 'informational');
  const html = await (await publicClient.request('/contact')).text();
  assert(html.includes('mailto:contact@localhost.test'));
  assert(html.includes('class="repository-link" href="https://github.com/gsor56/Docksite"'));
  assert(html.includes('class="github-icon"'));
  assert(!html.includes('name="message"'));
});
