import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { applyVitalCommand } from '../../../../src/shared/character/combat/vitalCommands.js';

test('character health: revision check, stale sheet saves, legacy ledger removal and RLS', async () => {
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
      -- A database that ran the previous migration still has the ledger and
      -- the four-argument RPC.
      create table character_vital_operations (
        character_id text not null references characters(id) on delete cascade,
        operation_id uuid not null,
        primary key (character_id, operation_id)
      );
      create function commit_character_vitals(p_id text, p_revision bigint, p_operation uuid, p_patch jsonb)
        returns jsonb language sql as $$ select '{}'::jsonb $$;
    `);
    const migration = await readFile(new URL('../../../../supabase/13_character_vitals.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // safe to rerun in SQL Editor

    assert.equal((await db.query("select to_regclass('public.character_vital_operations') as t")).rows[0].t, null,
      'the operation ledger is dropped');
    const signatures = (await db.query(`
      select pg_get_function_identity_arguments(p.oid) as args, p.prosrc as body
        from pg_proc p where p.proname = 'commit_character_vitals'
    `)).rows;
    assert.deepEqual(signatures.map((row) => row.args), ['p_id text, p_revision bigint, p_patch jsonb']);
    assert.doesNotMatch(signatures[0].body, /vital_operations/);

    await db.exec("set role authenticated; set test.actor = 'owner'");
    const read = async () => (await db.query("select * from characters where id='pc'")).rows[0];
    const commit = async (row, delta) => (await db.query(
      'select commit_character_vitals($1,$2,$3) as result',
      ['pc', row.row_revision, JSON.stringify(applyVitalCommand(row.data, { type: 'modifyHp', delta }, 30))],
    )).rows[0].result;

    const first = await read();
    const second = await read(); // two clients read the same version
    const a = await commit(first, -8);
    assert.equal(a.applied, true);
    assert.equal(a.row.data.currentHP, 27);
    assert.equal(a.row.data.tempHP, 0);
    assert.equal(Number(a.row.row_revision), Number(first.row_revision) + 1, 'a health commit advances row_revision');

    const conflict = await commit(second, -4);
    assert.equal(conflict.applied, false, 'a stale revision is never applied');
    assert.equal(conflict.row.data.currentHP, 27, 'the conflict returns the authoritative row');
    assert.equal((await read()).data.currentHP, 27);

    // Replaying an already committed request is just another stale revision.
    assert.equal((await commit(first, -8)).applied, false);
    assert.equal((await read()).data.currentHP, 27);

    await db.query("update characters set data=$1 where id='pc'", [JSON.stringify({ ...first.data, notes: 'new notes' })]);
    let row = await read();
    assert.equal(row.data.currentHP, 27, 'stale full-sheet save preserves canonical HP');
    assert.equal(row.data.notes, 'new notes');
    // An old PostgREST upsert supplies default revision 0 on conflict.
    await db.query("update characters set data=$1, vitals_revision=0 where id='pc'", [JSON.stringify(first.data)]);
    row = await read();
    assert.equal(row.data.currentHP, 27);
    assert.equal(Number(row.vitals_revision), 1);
    assert.equal((await commit(a.row, -2)).applied, false,
      'structural sheet saves also invalidate a computed health patch');
    await db.exec("set test.actor = 'reader'");
    await assert.rejects(commit(row, -5), /permission|unavailable/i);
    assert.equal((await read()).data.currentHP, 27);
  } finally { await db.close(); }
});
