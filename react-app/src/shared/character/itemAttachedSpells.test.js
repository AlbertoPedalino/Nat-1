import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectItemAttachedSpells,
  parseAttachedSpells,
} from './itemAttachedSpells.js';

const CUBE_ATTACHED_SPELLS = {
  charges: {
    1: ['mage armor|xphb', 'shield|xphb'],
    3: ["leomund's tiny hut|xphb"],
    4: ["mordenkainen's private sanctum|xphb", "otiluke's resilient sphere|xphb"],
    5: ['wall of force|xphb'],
  },
};

test('parses 5etools charge-based attached spells with their individual costs', () => {
  const grants = parseAttachedSpells(CUBE_ATTACHED_SPELLS);

  assert.equal(grants.length, 6);
  assert.deepEqual(
    grants.map(({ name, spellSource, usage, chargeCost }) => ({ name, spellSource, usage, chargeCost })),
    [
      { name: 'mage armor', spellSource: 'xphb', usage: 'charges', chargeCost: 1 },
      { name: 'shield', spellSource: 'xphb', usage: 'charges', chargeCost: 1 },
      { name: "leomund's tiny hut", spellSource: 'xphb', usage: 'charges', chargeCost: 3 },
      { name: "mordenkainen's private sanctum", spellSource: 'xphb', usage: 'charges', chargeCost: 4 },
      { name: "otiluke's resilient sphere", spellSource: 'xphb', usage: 'charges', chargeCost: 4 },
      { name: 'wall of force', spellSource: 'xphb', usage: 'charges', chargeCost: 5 },
    ],
  );
});

test('Cube of Force grants item-tagged spells only while attuned', () => {
  const cube = {
    name: 'Cube of Force',
    source: 'XDMG',
    reqAttune: true,
    attuned: true,
    charges: 10,
    attachedSpells: CUBE_ATTACHED_SPELLS,
  };

  const grants = collectItemAttachedSpells({ inventory: [cube] });
  assert.equal(grants.length, 6);
  assert.equal(grants[0].source.label, 'Cube of Force');
  assert.equal(grants[0].source.originType, 'item');
  assert.equal(collectItemAttachedSpells({ inventory: [{ ...cube, attuned: false }] }).length, 0);
});
