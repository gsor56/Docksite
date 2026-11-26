import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { prepareEnvironment } from './helpers.js';

test('upgrading core tables preserves populated tool relationships and foreign keys', async () => {
  const environment = await prepareEnvironment();
  const { db, migrate, now } = await import('@docksite/db');
  try {
    db.exec(
      'CREATE TABLE schema_migrations (version TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL)',
    );
    for (const version of ['001-core.sql', '002-short-links.sql', '003-indexes.sql']) {
      const sql = await readFile(
        new URL('../packages/db/migrations/' + version, import.meta.url),
        'utf8',
      );
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations VALUES (?,?,?)').run(
        version,
        createHash('sha256').update(sql).digest('hex'),
        now(),
      );
    }
    db.prepare(
      "INSERT INTO users (id,username,email,password_hash,role,created_at,updated_at) VALUES (1,'owner','owner@localhost.test','isolated-test-hash','owner',?,?)",
    ).run(now(), now());
    db.prepare(
      "INSERT INTO tools (id,slug,name,tagline,description,subdomain,module_key,status,owner_id,created_at,updated_at) VALUES (1,'shortener','Shortener','Working links','The implemented URL shortener','link','link-shortener','published',1,?,?)",
    ).run(now(), now());
    db.prepare("INSERT INTO tags (id,slug,name) VALUES (1,'links','Links')").run();
    db.prepare('INSERT INTO tool_tags VALUES (1,1)').run();
    db.prepare(
      "INSERT INTO short_links (id,tool_id,user_id,code,destination_url,created_at,updated_at) VALUES (1,1,1,'preserved','http://127.0.0.1:1/destination',?,?)",
    ).run(now(), now());
    db.prepare(
      "INSERT INTO analytics_events (tool_id,user_id,event,created_at) VALUES (1,1,'use',?)",
    ).run(now());
    assert.equal(migrate().length, 3);
    assert.equal(db.prepare('SELECT code FROM short_links WHERE id=1').get().code, 'preserved');
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM tool_tags').get().count, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM analytics_events').get().count, 1);
    assert.equal(
      db.prepare('SELECT module_key FROM tools WHERE id=1').get().module_key,
      'link-shortener',
    );
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
    assert.throws(() => db.prepare('DELETE FROM tools WHERE id=1').run(), /FOREIGN KEY/);
    assert.deepEqual(migrate(), []);
  } finally {
    db.close();
    await environment.cleanup();
  }
});

test('existing project approvals backfill developer access and preserve publication', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(':memory:');
  const migration = (file) =>
    readFile(new URL('../packages/db/migrations/' + file, import.meta.url), 'utf8');
  try {
    for (const file of [
      '001-core.sql',
      '002-short-links.sql',
      '003-indexes.sql',
      '004-project-reviews.sql',
      '005-public-content.sql',
    ])
      db.exec(await migration(file));
    const created = '2026-01-01T00:00:00.000Z';
    const user = db.prepare(
      'INSERT INTO users(username,email,password_hash,role,created_at,updated_at) VALUES (?,?,?,?,?,?)',
    );
    user.run('reviewed', 'reviewed@localhost.test', 'isolated-hash', 'user', created, created);
    user.run(
      'unreviewed',
      'unreviewed@localhost.test',
      'isolated-hash',
      'contributor',
      created,
      created,
    );
    const url = 'http://127.0.0.1:1/approved';
    db.prepare(
      "INSERT INTO tools(slug,subdomain,name,tagline,description,owner_id,external_url,status,created_at,updated_at) VALUES ('approved-tool','approved-tool','Approved tool','An existing listing','An existing approved project.',1,?,'published',?,?)",
    ).run(url, created, created);
    db.prepare(
      "INSERT INTO tool_submissions(title,idea,submitted_by,status,project_url,tool_id,created_at,updated_at) VALUES ('Approved tool','An existing approved project.',1,'approved',?,1,?,?)",
    ).run(url, created, created);
    db.exec(await migration('006-developer-publishing.sql'));
    assert.deepEqual(db.prepare('SELECT role,developer_approved_at FROM users ORDER BY id').all(), [
      { role: 'contributor', developer_approved_at: created },
      { role: 'contributor', developer_approved_at: null },
    ]);
    assert.deepEqual(db.prepare('SELECT status,approved_url FROM tools WHERE id=1').get(), {
      status: 'published',
      approved_url: url,
    });
    assert.deepEqual(db.pragma('foreign_key_check'), []);
  } finally {
    db.close();
  }
});
