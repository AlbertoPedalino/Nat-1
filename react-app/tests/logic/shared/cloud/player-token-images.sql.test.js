import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from './supabaseStubs.js';

const DIR = new URL('../../../../supabase/', import.meta.url);

const GM = '00000000-0000-4000-8000-000000000001';
const PLAYER = '00000000-0000-4000-8000-000000000002';
const STRANGER = '00000000-0000-4000-8000-000000000003';
const CAMPAIGN = '10000000-0000-4000-8000-000000000001';
const LIVE = '20000000-0000-4000-8000-00000000000a';
const PREP = '20000000-0000-4000-8000-00000000000b';

async function schema() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of (await readdir(DIR)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, DIR), 'utf8'));
  }
  await db.exec(`
    grant usage on schema public, storage to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant select, insert, delete on storage.objects to authenticated;
    insert into auth.users (id, email) values ('${GM}', 'gm@x'), ('${PLAYER}', 'p@x'), ('${STRANGER}', 's@x');
    insert into public.campaigns (id, name, gm, join_code) values ('${CAMPAIGN}', 'Table', '${GM}', 'CODE1');
    insert into public.campaign_members (campaign_id, user_id) values ('${CAMPAIGN}', '${PLAYER}');
    insert into public.map_scenes (id, campaign_id, name, is_live) values
      ('${LIVE}', '${CAMPAIGN}', 'Cave', true),
      ('${PREP}', '${CAMPAIGN}', 'Next week', false);
  `);
  return db;
}

const as = async (db, uid) => db.exec(`reset role; set test.uid = '${uid}'; set role authenticated;`);

// The client sets the owner on upload the way Supabase Storage does.
const upload = (db, uid, name) => db.query(
  "insert into storage.objects (bucket_id, name, owner) values ('map-images', $1, $2)",
  [name, uid],
);
const remove = async (db, name) => (await db.query(
  "delete from storage.objects where bucket_id = 'map-images' and name = $1 returning name",
  [name],
)).rows.length;

test('a player uploads a token picture only into a live scene of their campaign', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    await assert.doesNotReject(upload(db, PLAYER, `${CAMPAIGN}/${LIVE}/goblin.webp`));
    await assert.rejects(upload(db, PLAYER, `${CAMPAIGN}/${PREP}/early.webp`), /row-level security/);
    await assert.rejects(upload(db, PLAYER, `${CAMPAIGN}/${LIVE}/deeper/x.webp`), /row-level security/);
    await assert.rejects(upload(db, PLAYER, `${CAMPAIGN}/x.webp`), /row-level security/);

    await as(db, STRANGER);
    await assert.rejects(upload(db, STRANGER, `${CAMPAIGN}/${LIVE}/intruder.webp`), /row-level security/);

    await as(db, GM);
    await assert.doesNotReject(upload(db, GM, `${CAMPAIGN}/${PREP}/map.webp`));
  } finally {
    await db.close();
  }
});

test('a player deletes only the pictures they uploaded; the GM deletes any', async () => {
  const db = await schema();
  try {
    await as(db, GM);
    await upload(db, GM, `${CAMPAIGN}/${LIVE}/map.webp`);
    await as(db, PLAYER);
    await upload(db, PLAYER, `${CAMPAIGN}/${LIVE}/mine.webp`);

    assert.equal(await remove(db, `${CAMPAIGN}/${LIVE}/map.webp`), 0);
    assert.equal(await remove(db, `${CAMPAIGN}/${LIVE}/mine.webp`), 1);

    await upload(db, PLAYER, `${CAMPAIGN}/${LIVE}/again.webp`);
    await as(db, GM);
    assert.equal(await remove(db, `${CAMPAIGN}/${LIVE}/again.webp`), 1);
    assert.equal(await remove(db, `${CAMPAIGN}/${LIVE}/map.webp`), 1);
  } finally {
    await db.close();
  }
});
