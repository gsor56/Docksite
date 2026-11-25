import Database from 'better-sqlite3';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 19))
  throw new Error('Use Node.js 20.19+ on a supported release line.');
const db = new Database(':memory:');
if (db.prepare('SELECT 1 AS ready').get().ready !== 1) throw new Error('SQLite is unavailable.');
db.close();
console.log(`Runtime ready: Node.js ${process.versions.node}, SQLite loaded.`);
