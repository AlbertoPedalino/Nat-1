import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('./sections.sql', import.meta.url), 'utf8').toLowerCase();

test('sections SQL creates all tables, indexes, and enables RLS', () => {
  for (const table of ['boards', 'encounters', 'dm_screens']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\s*\\(`));
    assert.match(sql, new RegExp(`create index if not exists ${table}_owner_idx on public\\.${table}\\(owner\\)`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test('sections SQL policies are idempotent and owner-only without GM access', () => {
  assert.doesNotMatch(sql, /is_gm\s*\(/);
  for (const table of ['boards', 'encounters', 'dm_screens']) {
    for (const suffix of ['select', 'insert_own', 'update_own', 'delete_own']) {
      const policy = `${table}_${suffix}`;
      assert.match(sql, new RegExp(`drop policy if exists ${policy} on public\\.${table}`));
      assert.match(sql, new RegExp(`create policy ${policy} on public\\.${table}`));
    }
  }
  assert.equal((sql.match(/owner = auth\.uid\(\)/g) || []).length, 15);
});
