import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareEnvironment, Client } from './helpers.js';

test('direct localhost CMS setup creates the first owner and signs into CMS', async () => {
  const environment = await prepareEnvironment();
  process.env.NODE_ENV = 'development';
  const { db, migrate } = await import('@docksite/db');
  const { config } = await import('@docksite/config');
  const { createCmsApp } = await import('../apps/cms/app.js');
  const { isDirectLocalSetup } = await import('@docksite/auth/owner-setup');
  migrate();
  const server = createCmsApp().listen(config.CMS_PORT, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  try {
    const direct = { socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:3001' } };
    assert.equal(isDirectLocalSetup(direct), true);
    assert.equal(isDirectLocalSetup(direct, { ...config, NODE_ENV: 'production' }), false);
    assert.equal(isDirectLocalSetup(direct, { ...config, TRUST_PROXY: 1 }), false);
    assert.equal(
      isDirectLocalSetup({ ...direct, socket: { remoteAddress: '203.0.113.10' } }),
      false,
    );
    assert.equal(isDirectLocalSetup({ ...direct, headers: { host: 'other.invalid' } }), false);
    const client = new Client(`http://localhost:${config.CMS_PORT}`);
    const login = await client.request('/login');
    assert.equal(login.status, 200);
    assert.match(await login.text(), /Set up owner account/);
    const setup = await client.request('/setup');
    const html = await setup.text();
    assert.equal(setup.status, 200);
    assert.match(html, /type="hidden" name="setup_token"/);
    assert(html.includes(config.SETUP_TOKEN));
    const proxied = await client.request('/setup', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });
    const proxiedHtml = await proxied.text();
    assert.match(proxiedHtml, /type="password" name="setup_token"/);
    assert(!proxiedHtml.includes(config.SETUP_TOKEN));
    const response = await client.post(
      '/setup',
      {
        setup_token: config.SETUP_TOKEN,
        username: 'cms-owner',
        email: 'cms-owner@localhost.test',
        password: 'cms-owner-password-2026',
      },
      '/setup',
    );
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/dashboard');
    assert(client.cookies.has('docksite.cms.sid'));
    assert(!client.cookies.has('docksite.sid'));
    assert.equal((await client.request('/dashboard')).status, 200);
    assert.equal(db.prepare('SELECT role FROM users').get().role, 'owner');
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM tools').get().count, 0);
    assert.equal((await client.request('/setup')).status, 404);
    assert.equal(
      (
        await client.post('/setup', {
          setup_token: config.SETUP_TOKEN,
          username: 'second-owner',
          email: 'second-owner@localhost.test',
          password: 'second-owner-password-2026',
        })
      ).status,
      404,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
  } finally {
    await new Promise((resolve) => {
      server.closeAllConnections();
      server.close(resolve);
    });
    db.close();
    await environment.cleanup();
  }
});
