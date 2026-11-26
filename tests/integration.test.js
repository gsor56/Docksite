import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { prepareEnvironment, Client, hostRequest } from './helpers.js';

let environment,
  db,
  config,
  platform,
  cms,
  shortener,
  owner,
  ownerCms,
  ownerLink,
  user,
  other,
  contributorCms,
  adminCms,
  toolId;
const servers = [];
const password = 'test-password-12345';
before(async () => {
  environment = await prepareEnvironment();
  ({ db } = await import('@docksite/db'));
  const { migrate } = await import('@docksite/db');
  migrate();
  ({ config } = await import('@docksite/config'));
  const { createPlatformApp } = await import('../apps/platform/app.js');
  const { createCmsApp } = await import('../apps/cms/app.js');
  const { createLinkApp } = await import('../apps/tools/link-shortener/app.js');
  for (const [app, port] of [
    [createPlatformApp(), config.PORT],
    [createCmsApp(), config.CMS_PORT],
    [createLinkApp(), config.LINK_PORT],
  ]) {
    const server = app.listen(port, '0.0.0.0');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    servers.push(server);
  }
  platform = `http://localhost:${config.PORT}`;
  cms = `http://localhost:${config.CMS_PORT}`;
  shortener = `http://localhost:${config.LINK_PORT}`;
  owner = new Client(platform);
  ownerCms = new Client(cms);
  ownerLink = new Client(shortener, owner.cookies);
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

test('empty pages and secure first-owner setup work without seeded tools', async () => {
  const homepage = await owner.request('/');
  assert.equal(homepage.status, 200);
  assert.match(await homepage.text(), /No tools published yet/);
  assert.deepEqual((await (await owner.request('/api/tools')).json()).tools, []);
  assert.equal(
    (
      await owner.post('/register', {
        username: 'early-user',
        email: 'early@localhost.test',
        password,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await owner.post(
        '/setup',
        {
          setup_token: 'wrong-token-with-at-least-32-characters',
          username: 'owner',
          email: 'owner@localhost.test',
          password,
        },
        '/setup',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await owner.post(
        '/setup',
        {
          setup_token: config.SETUP_TOKEN,
          username: 'owner',
          email: 'owner@localhost.test',
          password,
        },
        '/setup',
      )
    ).status,
    302,
  );
  assert.equal((await owner.request('/setup')).status, 404);
  assert.equal(db.prepare("SELECT role FROM users WHERE username='owner'").get().role, 'owner');
  assert.equal((await owner.request('/dashboard')).status, 200);
  const hash = db
    .prepare("SELECT password_hash FROM users WHERE username='owner'")
    .get().password_hash;
  assert.notEqual(hash, password);
  assert.equal((await ownerCms.request('/dashboard')).status, 302);
  assert.equal(
    (await ownerCms.post('/login', { email: 'owner@localhost.test', password })).status,
    302,
  );
  assert(owner.cookies.has('docksite.sid'));
  assert(ownerCms.cookies.has('docksite.cms.sid'));
});

test('registration, session regeneration, CSRF, and fresh role checks work', async () => {
  const accounts = {};
  for (const username of ['reader', 'other', 'contributor', 'administrator']) {
    const client = new Client(platform);
    const oldCookie = (await client.token(), client.cookies.get('docksite.sid'));
    const response = await client.post('/register', {
      username,
      email: `${username}@localhost.test`,
      password,
      role: 'owner',
    });
    assert.equal(response.status, 302);
    assert.notEqual(client.cookies.get('docksite.sid'), oldCookie);
    assert.equal(db.prepare('SELECT role FROM users WHERE username=?').get(username).role, 'user');
    accounts[username] = client;
  }
  user = accounts.reader;
  other = accounts.other;
  for (const [name, role] of [
    ['contributor', 'contributor'],
    ['administrator', 'admin'],
  ]) {
    const id = db.prepare('SELECT id FROM users WHERE username=?').get(name).id;
    assert.equal((await ownerCms.post(`/users/${id}`, { role, is_active: 'on' })).status, 302);
  }
  contributorCms = new Client(cms);
  adminCms = new Client(cms);
  assert.equal(
    (await contributorCms.post('/login', { email: 'contributor@localhost.test', password })).status,
    302,
  );
  assert.equal(
    (await adminCms.post('/login', { email: 'administrator@localhost.test', password })).status,
    302,
  );
  assert.equal((await contributorCms.request('/users')).status, 403);
  const contributorId = db.prepare("SELECT id FROM users WHERE username = 'contributor'").get().id;
  await ownerCms.post(`/users/${contributorId}`, { role: 'admin', is_active: 'on' });
  assert.equal((await contributorCms.request('/users')).status, 200);
  await ownerCms.post(`/users/${contributorId}`, { role: 'contributor', is_active: 'on' });
  assert.equal((await contributorCms.request('/users')).status, 403);
  assert.equal(
    (
      await user.request('/build', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid',
      })
    ).status,
    400,
  );
  assert.equal(
    (await new Client(cms).post('/login', { email: 'reader@localhost.test', password })).status,
    403,
  );
  assert.equal((await ownerCms.post('/users/1', { role: 'user', is_active: 'on' })).status, 409);
  assert.equal((await adminCms.post('/users/1', { role: 'user', is_active: 'on' })).status, 403);
  assert.equal(
    (
      await user.request('/build', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'title=Missing+CSRF&idea=This+request+must+not+be+accepted',
      })
    ).status,
    403,
  );
  const token = await user.token('/build');
  assert.equal(
    (
      await user.request('/build', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'http://invalid.test',
        },
        body: new URLSearchParams({
          _csrf: token,
          title: 'Origin test',
          idea: 'A submission with an invalid origin.',
        }),
      })
    ).status,
    403,
  );
});

test('CMS creates real taxonomy and publishes only an implemented tool', async () => {
  assert.equal(
    (
      await ownerCms.post('/categories', {
        name: 'Utilities',
        slug: 'utilities',
        description: 'General-purpose utilities.',
      })
    ).status,
    302,
  );
  assert.equal((await ownerCms.post('/tags', { name: 'Links', slug: 'links' })).status, 302);
  const categoryId = db.prepare('SELECT id FROM categories').get().id;
  const tagId = db.prepare('SELECT id FROM tags').get().id;
  const metadata = {
    slug: 'url-shortener',
    name: 'URL Shortener',
    tagline: 'Create and manage short links.',
    description:
      'Shorten URLs with custom aliases, expiry dates, password protection, click limits, and click analytics.',
    subdomain: 'link',
    category_id: categoryId,
    tags: [tagId],
    module_key: '',
    status: 'published',
    icon: 'link',
    featured: 'on',
  };
  assert.equal((await ownerCms.post('/tools', metadata)).status, 422);
  assert.equal(
    (await ownerCms.post('/tools', { ...metadata, module_key: 'link-shortener', status: 'draft' }))
      .status,
    302,
  );
  toolId = db.prepare('SELECT id FROM tools WHERE slug=?').get(metadata.slug).id;
  assert.equal((await owner.request('/tools/url-shortener')).status, 404);
  assert.equal((await ownerLink.request('/')).status, 404);
  assert.equal(
    (await contributorCms.post(`/tools/${toolId}`, { ...metadata, module_key: 'link-shortener' }))
      .status,
    403,
  );
  assert.equal(
    (await ownerCms.post(`/tools/${toolId}`, { ...metadata, module_key: 'link-shortener' })).status,
    302,
  );
  assert.equal((await ownerLink.request('/')).status, 200);
  const result = await (
    await owner.request('/api/tools?category=utilities&tag=links&search=short&sort=popular')
  ).json();
  assert.equal(result.total, 1);
  const tool = result.tools[0];
  for (const field of [
    'id',
    'slug',
    'name',
    'tagline',
    'description',
    'category',
    'tags',
    'subdomain',
    'status',
    'featured',
    'icon',
    'url',
    'created_at',
    'updated_at',
  ])
    assert(field in tool, field);
  assert.equal(tool.url, `${platform}/t/link`);
  assert.equal((await owner.request('/api/tools?search=absent')).status, 200);
  assert.equal((await (await owner.request('/api/tools?search=absent')).json()).total, 0);
  assert.equal((await owner.request('/api/tools?sort=invalid')).status, 422);
  for (const path of [
    '/tools',
    '/tools?sort=name',
    '/categories',
    '/categories/utilities',
    '/api/tools/url-shortener',
  ])
    assert.equal((await owner.request(path)).status, 200, path);
});

test('landing pages expose actual SEO metadata and escape content', async () => {
  const response = await owner.request('/tools/url-shortener');
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<h1>\s*URL Shortener\s*<\/h1>/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${platform}/tools/url-shortener">`));
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  const structured = JSON.parse(
    html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1],
  );
  assert.equal(structured['@type'], 'WebApplication');
  assert.equal(structured.url, `${platform}/t/link`);
  assert.equal(structured.name, 'URL Shortener');
  const sitemap = await (await owner.request('/sitemap.xml')).text();
  assert.match(sitemap, /tools\/url-shortener/);
  assert.match(sitemap, /categories\/utilities/);
  assert.match(await (await owner.request('/robots.txt')).text(), /Sitemap:/);
  assert.equal(
    (await ownerCms.post('/settings', { platform_name: 'Docksite <script>alert(1)</script>' }))
      .status,
    302,
  );
  const home = await (await owner.request('/')).text();
  assert(!home.includes('<script>alert(1)</script>'));
  assert(home.includes('&lt;script&gt;'));
  await ownerCms.post('/settings', { platform_name: 'Docksite' });
});

test('submissions, CMS pages, and contributor ownership are enforced', async () => {
  assert.equal(
    (
      await user.post(
        '/build',
        { title: 'A real submission', idea: 'An idea submitted through the working review flow.' },
        '/build',
      )
    ).status,
    302,
  );
  const submissionId = db.prepare('SELECT id FROM tool_submissions').get().id;
  assert.equal(
    (
      await ownerCms.post(`/submissions/${submissionId}/review`, {
        status: 'approved',
        review_note: 'Reviewed in an isolated test.',
      })
    ).status,
    302,
  );
  assert.equal(
    db.prepare('SELECT status FROM tool_submissions WHERE id=?').get(submissionId).status,
    'approved',
  );
  assert.equal(
    db.prepare("SELECT developer_approved_at FROM users WHERE username='reader'").get()
      .developer_approved_at,
    null,
  );
  assert.equal((await contributorCms.request(`/tools/${toolId}/edit`)).status, 403);
  const metadata = {
    slug: 'contributor-draft',
    name: 'Contributor draft',
    tagline: 'An unpublished draft record.',
    description: 'A draft submitted by its assigned contributor.',
    subdomain: 'contributor-draft',
    category_id: '',
    module_key: '',
    status: 'draft',
    icon: 'box',
  };
  assert.equal((await contributorCms.post('/tools', metadata)).status, 302);
  const draftId = db.prepare('SELECT id FROM tools WHERE slug=?').get(metadata.slug).id;
  assert.equal(
    (
      await contributorCms.post(`/tools/${draftId}`, {
        ...metadata,
        status: 'published',
        module_key: 'link-shortener',
      })
    ).status,
    403,
  );
  assert.equal((await contributorCms.post(`/tools/${draftId}/delete`, {})).status, 302);
  for (const path of [
    '/dashboard',
    '/tools',
    '/tools/new',
    `/tools/${toolId}`,
    `/tools/${toolId}/edit`,
    '/categories',
    '/tags',
    '/submissions',
    '/users',
    '/media',
    '/analytics',
    '/settings',
    '/activity',
  ])
    assert.equal((await ownerCms.request(path)).status, 200, path);
});

test('short links create, redirect, edit, generate QR, and isolate ownership', async () => {
  const destination = 'http://127.0.0.1:1/destination?value=1';
  assert.equal(
    (
      await ownerLink.post('/links', {
        destination_url: 'javascript:alert(1)',
        alias: 'invalid',
        is_active: 'on',
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await ownerLink.post('/links', {
        destination_url: destination,
        alias: 'login',
        is_active: 'on',
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await ownerLink.post('/links', {
        destination_url: destination,
        alias: 'working',
        is_active: 'on',
      })
    ).status,
    302,
  );
  const link = db.prepare("SELECT * FROM short_links WHERE code='working'").get();
  assert.equal(
    (
      await ownerLink.post('/links', {
        destination_url: destination,
        alias: 'working',
        is_active: 'on',
      })
    ).status,
    409,
  );
  const redirect = await new Client(shortener).request('/working');
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('location'), destination);
  assert.equal(
    db.prepare('SELECT click_count FROM short_links WHERE id=?').get(link.id).click_count,
    1,
  );
  assert.equal(
    db.prepare('SELECT COUNT(*) AS total FROM short_link_clicks WHERE short_link_id=?').get(link.id)
      .total,
    1,
  );
  assert.equal((await ownerLink.request(`/links/${link.id}`)).status, 200);
  const qr = await ownerLink.request(`/links/${link.id}/qr.png`);
  assert.equal(qr.status, 200);
  assert.deepEqual(
    Buffer.from(await qr.arrayBuffer()).subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  const otherLink = new Client(shortener, other.cookies);
  assert.equal((await otherLink.request(`/links/${link.id}`)).status, 404);
  assert.equal(
    (await otherLink.post(`/links/${link.id}`, { destination_url: destination, is_active: 'on' }))
      .status,
    404,
  );
  const updated = 'http://127.0.0.1:1/updated';
  assert.equal(
    (await ownerLink.post(`/links/${link.id}`, { destination_url: updated, is_active: 'on' }))
      .status,
    302,
  );
  assert.equal((await new Client(shortener).request('/working')).headers.get('location'), updated);
  assert.equal((await ownerLink.post(`/api/links/${link.id}/share`, {})).status, 204);
  assert.equal(
    (await ownerLink.post('/links', { destination_url: destination, is_active: 'on' })).status,
    302,
  );
  assert.match(
    db.prepare('SELECT code FROM short_links ORDER BY id DESC LIMIT 1').get().code,
    /^[a-z0-9_-]{8}$/,
  );
});

test('password gates, expiry, disable, delete, and unknown links work', async () => {
  const destination = 'http://127.0.0.1:1/protected';
  assert.equal(
    (
      await ownerLink.post('/links', {
        destination_url: destination,
        alias: 'protected',
        password,
        is_active: 'on',
      })
    ).status,
    302,
  );
  const guest = new Client(shortener);
  assert.match(await (await guest.request('/protected')).text(), /Password protected link/);
  assert.equal(
    (await guest.post('/protected/unlock', { password: 'wrong' }, '/protected')).status,
    401,
  );
  assert.equal((await guest.post('/protected/unlock', { password }, '/protected')).status, 302);
  assert.equal((await guest.request('/protected')).headers.get('location'), destination);
  const protectedLink = db.prepare("SELECT * FROM short_links WHERE code='protected'").get();
  assert.equal(
    (
      await ownerLink.post(`/links/${protectedLink.id}`, {
        destination_url: destination,
        password: 'replacement-password-123',
        is_active: 'on',
      })
    ).status,
    302,
  );
  assert.match(await (await guest.request('/protected')).text(), /Password protected link/);
  assert.equal(
    (
      await ownerLink.post('/links', {
        destination_url: destination,
        alias: 'expired',
        expires_at: 'not-a-date',
        is_active: 'on',
      })
    ).status,
    422,
  );
  await ownerLink.post('/links', {
    destination_url: destination,
    alias: 'expired',
    expires_at: new Date(Date.now() + 60000).toISOString(),
    is_active: 'on',
  });
  db.prepare("UPDATE short_links SET expires_at=? WHERE code='expired'").run(
    new Date(Date.now() - 1000).toISOString(),
  );
  assert.equal((await guest.request('/expired')).status, 410);
  const working = db.prepare("SELECT id FROM short_links WHERE code='working'").get();
  assert.equal((await ownerLink.post(`/links/${working.id}/disable`, {})).status, 302);
  assert.equal((await guest.request('/working')).status, 410);
  assert.equal((await ownerLink.post(`/links/${working.id}/delete`, {})).status, 302);
  assert.equal((await guest.request('/working')).status, 404);
  assert.equal(
    (
      await ownerLink.post('/links', {
        destination_url: destination,
        alias: 'working',
        is_active: 'on',
      })
    ).status,
    409,
  );
  assert.equal((await guest.request('/does-not-exist')).status, 404);
  assert.equal((await guest.request('/invalid.alias')).status, 404);
  assert.equal((await guest.request('/' + 'x'.repeat(50))).status, 404);
});

test('concurrent redirects cannot exceed a click limit and HEAD does not count', async () => {
  await ownerLink.post('/links', {
    destination_url: 'http://127.0.0.1:1/limited',
    alias: 'limited',
    click_limit: '3',
    is_active: 'on',
  });
  assert.equal((await new Client(shortener).request('/limited', { method: 'HEAD' })).status, 302);
  assert.equal(
    db.prepare("SELECT click_count FROM short_links WHERE code='limited'").get().click_count,
    0,
  );
  const responses = await Promise.all(
    Array.from({ length: 12 }, () => new Client(shortener).request('/limited')),
  );
  assert.equal(responses.filter((response) => response.status === 302).length, 3);
  assert.equal(responses.filter((response) => response.status === 410).length, 9);
  const link = db.prepare("SELECT * FROM short_links WHERE code='limited'").get();
  assert.equal(link.click_count, 3);
  assert.equal(
    db.prepare('SELECT COUNT(*) AS total FROM short_link_clicks WHERE short_link_id=?').get(link.id)
      .total,
    3,
  );
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) AS total FROM analytics_events WHERE event='use' AND json_extract(metadata,'$.action')='click' AND json_extract(metadata,'$.short_link_id')=?",
      )
      .get(link.id).total,
    3,
  );
});

test('uploads enforce authorization, MIME signatures, safe filenames, size, and expiry', async () => {
  const image = await readFile(
    new URL('../packages/ui/assets/docksite-favicon-512.png', import.meta.url),
  );
  async function upload(client, buffer, type, name, extra = {}) {
    const token = await client.token('/media');
    const form = new FormData();
    form.set('_csrf', token);
    form.set('file', new Blob([buffer], { type }), name);
    for (const [key, value] of Object.entries(extra)) form.set(key, value);
    return client.request('/media', { method: 'POST', body: form, headers: { origin: cms } });
  }
  assert.equal((await upload(ownerCms, image, 'image/png', 'oversized.png')).status, 413);
  assert.equal(
    (await upload(ownerCms, Buffer.from('not an image'), 'image/png', 'invalid.png')).status,
    422,
  );
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=',
    'base64',
  );
  assert.equal((await upload(ownerCms, png, 'image/jpeg', 'wrong.jpg')).status, 422);
  assert.equal(
    (
      await upload(ownerCms, png, 'image/png', '../../image.png', {
        expires_at: new Date(Date.now() + 60000).toISOString(),
      })
    ).status,
    302,
  );
  const media = db.prepare('SELECT * FROM media').get();
  assert.match(media.stored_path, /^[a-f0-9-]+\.png$/);
  assert(!media.original_name.includes('/'));
  assert.equal((await ownerCms.request(`/media/${media.id}/file`)).status, 200);
  assert.equal((await contributorCms.request(`/media/${media.id}/file`)).status, 403);
  assert.equal((await new Client(cms).request(`/media/${media.id}/file`)).status, 302);
  db.prepare('UPDATE media SET expires_at=? WHERE id=?').run(
    new Date(Date.now() - 1000).toISOString(),
    media.id,
  );
  assert.equal((await ownerCms.request(`/media/${media.id}/file`)).status, 404);
  assert.equal((await readdir(config.UPLOAD_DIR)).length, 1);
});

test('path gateway and optional Host routing work and unpublished tools return 404', async () => {
  const gateway = new Client(platform, owner.cookies);
  assert.equal((await gateway.request('/t/link')).status, 200);
  assert.equal((await gateway.request('/t/link/links/new')).status, 200);
  assert.equal(
    (
      await gateway.post(
        '/t/link/links',
        { destination_url: 'http://127.0.0.1:1/gateway', alias: 'gateway', is_active: 'on' },
        '/t/link/login',
      )
    ).status,
    302,
  );
  assert.equal(
    (await new Client(platform).request('/t/link/gateway')).headers.get('location'),
    'http://127.0.0.1:1/gateway',
  );
  assert.equal((await gateway.request('/cms/login')).status, 200);
  const subdomain = await hostRequest(platform, `link.localhost:${config.PORT}`);
  assert.equal(subdomain.status, 200);
  assert.match(subdomain.body, /<h1>\s*URL Shortener\s*<\/h1>/);
  assert.equal((await hostRequest(platform, `unknown.localhost:${config.PORT}`)).status, 404);
  assert.equal((await gateway.request('/t/unknown')).status, 404);
  assert.equal((await ownerCms.post(`/tools/${toolId}/archive`, {})).status, 302);
  assert.equal((await gateway.request('/t/link')).status, 404);
  assert.equal((await ownerLink.request('/')).status, 404);
  assert.equal((await owner.request('/api/tools/url-shortener')).status, 404);
  assert(!(await (await owner.request('/sitemap.xml')).text()).includes('/tools/url-shortener'));
  assert.equal((await ownerCms.post(`/tools/${toolId}/delete`, {})).status, 409);
});

test('login rate limiting and logout invalidate sessions', async () => {
  const client = new Client(platform);
  let limited = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await client.post('/login', {
      email: 'nonexistent@localhost.test',
      password: 'invalid-password',
    });
    if (response.status === 429) {
      limited = true;
      break;
    }
    assert.equal(response.status, 401);
  }
  assert(limited);
  assert.equal((await user.post('/logout', {}, '/dashboard')).status, 302);
  assert.equal((await user.request('/dashboard')).status, 302);
});
