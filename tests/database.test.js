import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareEnvironment } from './helpers.js';

test('migrations are repeatable, enforce constraints, and match the schema snapshot', async () => {
  const environment = await prepareEnvironment();
  const { db, migrate } = await import('@docksite/db');
  const { default: Database } = await import('better-sqlite3');
  try {
    assert.equal(migrate().length, 5);
    assert.deepEqual(migrate(), []);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM tools').get().count, 0);
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO short_links(tool_id,user_id,code,destination_url,created_at,updated_at) VALUES (1,1,'bad','http://localhost',?,?)",
          )
          .run(new Date().toISOString(), new Date().toISOString()),
      /FOREIGN KEY/,
    );
    const snapshot = new Database(':memory:');
    snapshot.exec(await readFile(new URL('../packages/db/schema.sql', import.meta.url), 'utf8'));
    const tables = (connection) =>
      connection.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    assert.deepEqual(tables(db), tables(snapshot));
    for (const { name } of tables(db))
      assert.deepEqual(db.pragma(`table_info(${name})`), snapshot.pragma(`table_info(${name})`));
    snapshot.close();
  } finally {
    db.close();
    await environment.cleanup();
  }
});
