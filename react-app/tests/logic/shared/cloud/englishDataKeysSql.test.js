import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// supabase/maintenance/english_data_keys.sql renames the GM Board's Italian
// field names inside stored data: escaped inside the boards' JSON strings,
// plain inside the dungeons' jsonb. Only names change; values stay.

const stateV1 = { season: 'Spring', meteo: 'Rain', intensity: 'Heavy', min: 480 };
const tablesV1 = {
  weather: [{ s: 'Spring', sole: 10, pioggia: 19 }],
  loot: [{ r: 2, tipo: 'Cursed Item', rarita: 'Legendary', qualita: 'Corrupted', valore: '75×Lv', extra: '' }],
  trap: [[{ r: 2, tipo: 'Deadly', lv: '4', dc: 15, danno: '11 (2d10)' }]],
  env: [{ r: 2, gravita: 'Legendary' }],
  compl: [{ r: 2, type: 'Encounter' }],
};
const room = { rooms: [{ id: 'room_1', slots: [{ type: 'Trap', extra: { data: { tipo: 'Deadly', danno: '2d10' } } }],
  loot: { data: { tipo: 'Magic Item', rarita: 'Rare', qualita: 'Damaged', valore: '45×Lv' } } }] };

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create table public.boards (id text primary key, data jsonb not null);
    create table public.map_dungeons (scene_id text primary key, key jsonb);
  `);
  await db.query('insert into public.boards values ($1, $2)', ['b1', JSON.stringify({
    'gb:board:b1:state:v1': JSON.stringify(stateV1),
    'gb:board:b1:tables:v1': JSON.stringify(tablesV1),
    'gb:board:b1:note': 'il tipo di danno: "tipo" resta testo',
  })]);
  await db.query('insert into public.boards values ($1, $2)', ['b2', JSON.stringify({
    'gb:board:b2:state:v1': JSON.stringify({ weather: 'Clear' }),
  })]);
  await db.query('insert into public.map_dungeons values ($1, $2)', ['s1', JSON.stringify(room)]);
  return db;
}

test('every Italian field name becomes English, values and other text untouched; re-running is a no-op', async () => {
  const sql = await readFile(new URL('../../../../supabase/maintenance/english_data_keys.sql', import.meta.url), 'utf8');
  const db = await setup();
  try {
    await db.exec(sql);
    await db.exec(sql);

    const boards = (await db.query("select id, data from public.boards order by id")).rows;
    const payload = boards[0].data;
    assert.deepEqual(JSON.parse(payload['gb:board:b1:state:v1']), {
      season: 'Spring', weather: 'Rain', intensity: 'Heavy', min: 480,
    });
    assert.deepEqual(JSON.parse(payload['gb:board:b1:tables:v1']), {
      weather: [{ s: 'Spring', clear: 10, rain: 19 }],
      loot: [{ r: 2, type: 'Cursed Item', rarity: 'Legendary', quality: 'Corrupted', value: '75×Lv', extra: '' }],
      trap: [[{ r: 2, type: 'Deadly', lv: '4', dc: 15, damage: '11 (2d10)' }]],
      env: [{ r: 2, severity: 'Legendary' }],
      compl: [{ r: 2, type: 'Encounter' }],
    });
    assert.equal(payload['gb:board:b1:note'], 'il tipo di danno: "tipo" resta testo');
    assert.deepEqual(JSON.parse(boards[1].data['gb:board:b2:state:v1']), { weather: 'Clear' });

    const dungeon = (await db.query('select key from public.map_dungeons')).rows[0].key;
    assert.deepEqual(dungeon, { rooms: [{ id: 'room_1', slots: [{ type: 'Trap', extra: { data: { type: 'Deadly', damage: '2d10' } } }],
      loot: { data: { type: 'Magic Item', rarity: 'Rare', quality: 'Damaged', value: '45×Lv' } } }] });

    const backup = (await db.query('select source, id from public.english_data_keys_backup order by source, id')).rows;
    assert.deepEqual(backup, [{ source: 'boards', id: 'b1' }, { source: 'map_dungeons', id: 's1' }]);
  } finally {
    await db.close();
  }
});
