#!/usr/bin/env node
// Delete throwaway test accounts (and all their data) from the Neon database.
//
// Safe by default: a dry run that only PRINTS what it would delete. Pass --yes
// to actually delete, inside a single transaction.
//
//   node server/scripts/cleanup-test-accounts.mjs                  # dry run
//   node server/scripts/cleanup-test-accounts.mjs --yes            # delete
//   node server/scripts/cleanup-test-accounts.mjs --domains=foo.dev,bar.dev
//
// "Test accounts" are users in neon_auth."user" whose email ends in one of the
// test domains (default: dreno-neon.dev, dreno-test.dev). Change with --domains.
//
// Connection: DATABASE_URL_UNPOOLED or DATABASE_URL from the environment; if
// neither is set, it loads the repo-root .env.local.

import { readFileSync } from 'node:fs'
import pg from 'pg'
const { Client } = pg

// ── args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: cleanup-test-accounts.mjs [--yes] [--domains=a.dev,b.dev]')
  process.exit(0)
}
const EXECUTE = args.includes('--yes') || args.includes('-y')
const domainsArg = args.find(a => a.startsWith('--domains='))
const DOMAINS = (domainsArg ? domainsArg.slice('--domains='.length) : 'dreno-neon.dev,dreno-test.dev')
  .split(',').map(s => s.trim()).filter(Boolean)

// ── connection string ───────────────────────────────────────────────────────
// We pass ssl options to pg explicitly, so drop sslmode/channel_binding from the
// URL — otherwise pg prints a noisy deprecation warning about SSL mode aliases.
function clean(url) {
  if (!url) return url
  try {
    const u = new URL(url)
    u.searchParams.delete('sslmode')
    u.searchParams.delete('channel_binding')
    return u.toString()
  } catch { return url }
}

function connectionString() {
  const strip = v => v && v.replace(/^["']|["']$/g, '')
  let url = strip(process.env.DATABASE_URL_UNPOOLED) || strip(process.env.DATABASE_URL)
  if (url) return clean(url)
  // fall back to repo-root .env.local
  const envPath = new URL('../../.env.local', import.meta.url)
  let text
  try { text = readFileSync(envPath, 'utf8') } catch {
    throw new Error('No DATABASE_URL in env and no .env.local at repo root.')
  }
  for (const key of ['DATABASE_URL_UNPOOLED', 'DATABASE_URL']) {
    const line = text.split('\n').find(l => l.startsWith(key + '='))
    if (line) return clean(strip(line.slice(key.length + 1).trim()))
  }
  throw new Error('No DATABASE_URL_UNPOOLED / DATABASE_URL found in .env.local.')
}

// Identity + auth tables, deleted parent-last. Only ones that exist are used.
const IDENTITY = [
  { schema: 'public', table: 'athletes', col: 'id' },
  { schema: 'public', table: 'coaches', col: 'id' },
  { schema: 'public', table: 'administrators', col: 'id' },
  { schema: 'public', table: 'profiles', col: 'id' },
  { schema: 'neon_auth', table: 'session', col: 'userId' },
  { schema: 'neon_auth', table: 'account', col: 'userId' },
  { schema: 'neon_auth', table: 'user', col: 'id' },
]
// Columns in OTHER public tables that reference a user — their rows are deleted
// first so the identity rows above aren't FK-blocked.
const REF_COLS = ['athlete_id', 'coach_id', 'administrator_id', 'sender_id', 'recipient_id', 'user_id', 'created_by']

async function main() {
  const client = new Client({ connectionString: connectionString(), ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const likes = DOMAINS.map((_, i) => `email like $${i + 1}`).join(' or ')
    const { rows } = await client.query(
      `select id, email from neon_auth."user" where ${likes} order by email`,
      DOMAINS.map(d => '%@' + d),
    )
    const ids = rows.map(r => r.id)
    console.log(`Test domains: ${DOMAINS.join(', ')}`)
    console.log(`Matched ${ids.length} test user(s):`)
    rows.forEach(r => console.log('  ' + r.email))
    if (ids.length === 0) { console.log('Nothing to do.'); return }

    // Build the delete plan from tables/columns that actually exist.
    const exists = await client.query(
      `select table_schema, table_name, column_name from information_schema.columns
       where (table_schema='public' or table_schema='neon_auth')`,
    )
    const has = (s, t, c) => exists.rows.some(r => r.table_schema === s && r.table_name === t && r.column_name === c)

    const dataSteps = exists.rows
      .filter(r => r.table_schema === 'public' && REF_COLS.includes(r.column_name)
        && !IDENTITY.some(i => i.table === r.table_name)) // identity tables handled below
      .map(r => ({ schema: 'public', table: r.table_name, col: r.column_name }))
    const idSteps = IDENTITY.filter(s => has(s.schema, s.table, s.col))
    const plan = [...dataSteps, ...idSteps]

    // Count per step (what would be / was deleted).
    console.log(EXECUTE ? '\nDeleting:' : '\nWould delete (dry run — pass --yes to apply):')
    if (EXECUTE) await client.query('begin')
    for (const s of plan) {
      const q = EXECUTE
        ? `delete from ${s.schema}."${s.table}" where "${s.col}" = any($1)`
        : `select count(*)::int n from ${s.schema}."${s.table}" where "${s.col}" = any($1)`
      const res = await client.query(q, [ids])
      const n = EXECUTE ? res.rowCount : res.rows[0].n
      if (n > 0) console.log(`  ${s.schema}.${s.table} (${s.col}): ${n}`)
    }
    if (EXECUTE) { await client.query('commit'); console.log('\nDone.') }
    else console.log('\nDry run only. Re-run with --yes to delete.')
  } catch (err) {
    try { await client.query('rollback') } catch { /* not in txn */ }
    console.error('\nFailed:', err.message)
    console.error('(If a foreign key blocked it, add that table/column to the script.)')
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

main()
