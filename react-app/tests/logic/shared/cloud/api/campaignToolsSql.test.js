import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('campaign links survive board removal and migration reruns preserve explicit unlinks', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table boards (id text primary key, owner text, link_group_id text);
      create table encounters (id text primary key);
      create table campaigns (id text primary key, gm text,
        hexcrawl_board_id text references boards(id) on delete set null);
      insert into boards values ('board', 'gm', 'link_party'), ('solo', 'gm', null), ('foreign', 'other', 'link_private');
      insert into campaigns values ('campaign', 'gm', 'board'), ('solo-campaign', 'gm', 'solo'), ('foreign-campaign', 'gm', 'foreign');
    `);
    const migration = await readFile(new URL('../../../../../supabase/11_campaign_tools.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    const read = async (id) => (await db.query('select * from campaigns where id = $1', [id])).rows[0];
    assert.equal((await read('campaign')).link_group_id, 'link_party');
    await db.exec("insert into encounters values ('enc-one'), ('enc-two'); update campaigns set dungeon_encounter_id = 'enc-two' where id = 'campaign'");
    await db.exec(migration);
    assert.equal((await read('campaign')).dungeon_encounter_id, 'enc-two', 'rerunning preserves the chosen destination');
    assert.match((await read('solo-campaign')).link_group_id, /^link_/);
    assert.equal((await read('foreign-campaign')).link_group_id, null, 'migration cannot borrow another owner’s group');
    await db.exec("delete from boards where id = 'board'");
    assert.equal((await read('campaign')).hexcrawl_board_id, null);
    assert.equal((await read('campaign')).link_group_id, 'link_party', 'removing a board leaves the campaign group intact');
    assert.equal((await read('campaign')).dungeon_encounter_id, 'enc-two', 'removing a board preserves the dungeon destination');
    await db.exec("delete from encounters where id = 'enc-two'");
    assert.equal((await read('campaign')).dungeon_encounter_id, null);
    assert.equal((await read('campaign')).link_group_id, 'link_party', 'deleting a builder keeps other campaign links intact');
    await db.exec("update campaigns set link_group_id = null where id = 'solo-campaign'");
    await db.exec(migration);
    assert.equal((await read('solo-campaign')).link_group_id, null, 'rerunning must not recreate a removed link');
    assert.equal((await read('campaign')).link_group_id, 'link_party');
  } finally { await db.close(); }
});
