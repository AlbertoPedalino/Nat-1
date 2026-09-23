import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { applyVitalCommand } from '../../../../src/shared/character/combat/vitalCommands.js';

test('character health: stale writes, concurrent commands, retry deduplication and RLS', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role authenticated;
      create table characters (id text primary key, owner text, data jsonb not null, updated_at timestamptz default now());
      alter table characters enable row level security;
      grant select, insert, update on characters to authenticated;
      create policy read_character on characters for select using (true);
      create policy update_character on characters for update using (owner = current_setting('test.actor'));
      insert into characters values ('pc', 'owner', '{"currentHP":30,"tempHP":5,"notes":"original"}', now());
    `);
    const migration = await readFile(new URL('../../../../supabase/character_vitals.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // safe to rerun in SQL Editor
    await db.exec("set role authenticated; set test.actor = 'owner'");
    const read = async () => (await db.query("select * from characters where id='pc'")).rows[0];
    const commit = async (row, delta, id) => (await db.query(
      'select commit_character_vitals($1,$2,$3,$4) as result',
      ['pc', row.row_revision, id, JSON.stringify(applyVitalCommand(row.data, { type: 'modifyHp', delta }, 30))],
    )).rows[0].result;
    const first = await read();
    const second = await read(); // two clients read the same version
    const id1 = '00000000-0000-4000-8000-000000000001';
    const id2 = '00000000-0000-4000-8000-000000000002';
    const a = await commit(first, -8, id1);
    assert.equal(a.applied, true);
    assert.equal(a.row.data.currentHP, 27);
    assert.equal(a.row.data.tempHP, 0);
    const conflict = await commit(second, -4, id2);
    assert.equal(conflict.applied, false);
    const b = await commit(conflict.row, -4, id2);
    assert.equal(b.row.data.currentHP, 23);
    const replay = await commit(first, -8, id1);
    assert.equal(replay.row.data.currentHP, 23, 'lost response retry does not deal damage twice');

    await db.query("update characters set data=$1 where id='pc'", [JSON.stringify({ ...first.data, notes: 'new notes' })]);
    let row = await read();
    assert.equal(row.data.currentHP, 23, 'stale sheet save preserves canonical HP');
    assert.equal(row.data.notes, 'new notes');
    // An old PostgREST upsert supplies default revision 0 on conflict.
    await db.query("update characters set data=$1, vitals_revision=0 where id='pc'", [JSON.stringify(first.data)]);
    row = await read();
    assert.equal(row.data.currentHP, 23);
    assert.equal(Number(row.vitals_revision), 2);
    assert.equal((await commit(b.row, -2, '00000000-0000-4000-8000-000000000003')).applied, false,
      'structural sheet saves also invalidate a computed health patch');
    await db.exec("set test.actor = 'reader'");
    await assert.rejects(commit(row, -5, '00000000-0000-4000-8000-000000000004'), /permission|unavailable/i);
    assert.equal((await read()).data.currentHP, 23);
  } finally { await db.close(); }
});
