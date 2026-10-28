import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectScrollSpells,
  scrollCardName,
  scrollStatsOf,
  scrollSpellStats,
  spellScrollLevel,
  writeOnScroll,
} from '../../../../../src/shared/character/inventory/spellScrolls.js';
import { buildSpellInfo } from '../../../../../src/pages/charsheet/spells/spellsTabLogic.js';

const scroll = (level, spell, extra = {}) => ({
  name: `Spell Scroll (Level ${level})`, source: 'XDMG', type: 'SC', spellScrollLevel: level, qty: 1,
  ...(spell ? { scrollSpell: spell } : {}),
  ...extra,
});

test('a scroll casts with its own save DC and attack bonus, by level (XDMG)', () => {
  assert.deepEqual([0, 2, 3, 5, 7, 9].map(scrollSpellStats), [
    { dc: 13, attack: 5 }, { dc: 13, attack: 5 }, { dc: 15, attack: 7 },
    { dc: 17, attack: 9 }, { dc: 18, attack: 10 }, { dc: 19, attack: 11 },
  ]);
  assert.equal(spellScrollLevel({ spellScrollLevel: 0 }), 0);
  assert.equal(spellScrollLevel({ name: 'Rope' }), null);
});

test('the inventory card names the spell written on the scroll', () => {
  assert.equal(scrollCardName(scroll(3, { name: 'Fireball', source: 'XPHB' }), 'Spell Scroll (Level 3)'), 'Spell Scroll (Level 3): Fireball');
  assert.equal(scrollCardName(scroll(3), 'Spell Scroll (Level 3)'), 'Spell Scroll (Level 3)');
});

test('only scrolls with a spell written on them, and still in hand, are spells', () => {
  const C = { inventory: [
    scroll(3, { name: 'Fireball', source: 'XPHB' }),
    scroll(1),
    scroll(2, { name: 'Shatter', source: 'XPHB' }, { qty: 0 }),
    { name: 'Rope', source: 'XPHB', scrollSpell: { name: 'Fireball' } },
  ] };
  const grants = collectScrollSpells(C);
  assert.deepEqual(grants.map((grant) => [grant.name, grant.level, grant.source.label, grant.scroll]), [
    ['Fireball', 3, 'Scroll', { level: 3, dc: 15, attack: 7 }],
  ]);
});

test('the Spells tab lists a scroll spell apart from the same spell the character prepared', () => {
  const fireball = { name: 'Fireball', source: 'XPHB', level: 3, entries: ['A bright streak flashes.'] };
  const spellIndex = new Map([['fireball', fireball], ['fireball|xphb', fireball]]);
  const C = {
    className: 'Wizard', level: 5, classLevel: 5,
    selectedSpells: { 3: ['Fireball'] },
    inventory: [scroll(3, { name: 'Fireball', source: 'XPHB' })],
  };
  const rows = buildSpellInfo(C, spellIndex).leveled[3];
  assert.equal(rows.length, 2);
  const fromScroll = rows.find((row) => row.scroll);
  assert.deepEqual(fromScroll.scroll, { level: 3, dc: 15, attack: 7 });
  assert.equal(fromScroll.sourceInfo.label, 'Scroll');
  assert.equal(rows.find((row) => !row.scroll).scroll, null);
});

test('numbers typed on a scroll replace its fixed ones; blank keeps them', () => {
  assert.deepEqual(scrollStatsOf(scroll(1)), { dc: 13, attack: 5 });
  assert.deepEqual(scrollStatsOf(scroll(1, null, { scrollDc: 16, scrollAttack: 8 })), { dc: 16, attack: 8 });
  assert.deepEqual(scrollStatsOf(scroll(1, null, { scrollAttack: 8 })), { dc: 13, attack: 8 });
});

test('two scrolls of one spell written with different numbers are two rows', () => {
  const fireball = { name: 'Fireball', source: 'XPHB', level: 3, entries: ['A bright streak flashes.'] };
  const spellIndex = new Map([['fireball', fireball], ['fireball|xphb', fireball]]);
  const spell = { name: 'Fireball', source: 'XPHB' };
  const C = {
    className: 'Wizard', level: 5, classLevel: 5,
    inventory: [scroll(3, spell), scroll(3, spell, { scrollDc: 16, scrollAttack: 8 }), scroll(3, spell)],
  };
  const rows = buildSpellInfo(C, spellIndex).leveled[3];
  assert.deepEqual(rows.map((row) => [row.scroll.dc, row.scroll.attack]).sort(), [[15, 7], [16, 8]]);
});

const FIREBALL = { name: 'Fireball', source: 'XPHB' };
const COUNTERSPELL = { name: 'Counterspell', source: 'XPHB' };
const summary = (inventory) => inventory.map((item) => [item.scrollSpell?.name || '-', item.qty, item.scrollDc ?? null]);

test('writing a spell takes one scroll off the stack; the same spell again joins it', () => {
  const rope = { name: 'Rope', source: 'XPHB', qty: 1 };
  let inventory = [scroll(3, null, { qty: 3 }), rope];
  inventory = writeOnScroll(inventory, 0, { scrollSpell: FIREBALL });
  assert.deepEqual(summary(inventory), [['-', 2, null], ['Fireball', 1, null], ['-', 1, null]]);
  inventory = writeOnScroll(inventory, 0, { scrollSpell: FIREBALL });
  assert.deepEqual(summary(inventory), [['-', 1, null], ['Fireball', 2, null], ['-', 1, null]]);
  // The last blank scroll becomes a spell of its own, in place.
  inventory = writeOnScroll(inventory, 0, { scrollSpell: COUNTERSPELL });
  assert.deepEqual(summary(inventory), [['Counterspell', 1, null], ['Fireball', 2, null], ['-', 1, null]]);
  assert.equal(inventory[2], rope);
});

test('a scroll with typed numbers is another scroll: it joins only its own kind', () => {
  let inventory = [scroll(3, FIREBALL, { scrollDc: 16 }), scroll(3, null, { qty: 2 })];
  inventory = writeOnScroll(inventory, 1, { scrollSpell: FIREBALL });
  assert.deepEqual(summary(inventory), [['Fireball', 1, 16], ['-', 1, null], ['Fireball', 1, null]]);
  // Numbers belong to the whole entry; made equal, the two Fireball entries become one.
  inventory = writeOnScroll(inventory, 0, { scrollDc: null });
  assert.deepEqual(summary(inventory), [['-', 1, null], ['Fireball', 2, null]]);
});

test('changing or clearing the spell of a stack moves one scroll; a cleared one is blank again', () => {
  let inventory = [scroll(3, FIREBALL, { qty: 2, scrollDc: 16 }), scroll(3, null)];
  inventory = writeOnScroll(inventory, 0, { scrollSpell: null });
  assert.deepEqual(summary(inventory), [['Fireball', 1, 16], ['-', 2, null]]);
  inventory = writeOnScroll(inventory, 0, { scrollSpell: COUNTERSPELL });
  assert.deepEqual(summary(inventory), [['Counterspell', 1, 16], ['-', 2, null]]);
});

test('picking the spell a scroll already holds changes nothing', () => {
  const inventory = [scroll(3, FIREBALL, { qty: 2 })];
  assert.equal(writeOnScroll(inventory, 0, { scrollSpell: { ...FIREBALL } })[0], inventory[0]);
  assert.deepEqual(summary(writeOnScroll(inventory, 0, { scrollSpell: { ...FIREBALL } })), [['Fireball', 2, null]]);
});
