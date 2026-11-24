// Run an additive SQL migration against Neon using DATABASE_URL_UNPOOLED from .env.local.
// Usage: node neon/run-migration.mjs neon/migrations/009_admin_columns.sql
// Keep migrations additive + idempotent (ADD COLUMN IF NOT EXISTS, CREATE POLICY guarded).
import fs from 'node:fs';
import pg from 'pg';

const file = process.argv[2];
if (!file) { console.error('usage: node neon/run-migration.mjs <path.sql>'); process.exit(1); }

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
const sql = fs.readFileSync(file, 'utf8');

const c = new pg.Client({ connectionString: url });
await c.connect();
try {
  await c.query('BEGIN');
  await c.query(sql);
  await c.query('COMMIT');
  console.log('OK:', file);
} catch (e) {
  await c.query('ROLLBACK');
  console.error('FAILED, rolled back:', e.message);
  process.exit(1);
} finally {
  await c.end();
}
