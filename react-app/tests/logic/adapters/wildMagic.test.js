import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../src/adapters/registry.js';
import installWildMagic from '../../../src/adapters/classes/sorcerer/wild-magic.js';
import { collectAdapterActions } from '../../../src/shared/character/sheet/adapterActions.js';

installWildMagic(adapterRegistry);

// Wild Magic Sorcery: a card per feature, its text the feature's own from the
// data, none written in the adapter.
const feature = (name, level) => ({ name, level, subclassShortName: 'Wild Magic', entries: [`${name} text.`] });
const sorcerer = (level) => ({
  className: 'Sorcerer', classLevel: level, level, subclassShortName: 'Wild Magic',
  allSubFeatures: [
    feature('Wild Magic Surge', 3), feature('Tides of Chaos', 3), feature('Bend Luck', 6),
    feature('Controlled Chaos', 14), feature('Tamed Surge', 18),
  ],
});

test('each Wild Magic card shows its feature text from the data, at its level', () => {
  const cards = (level) => collectAdapterActions(sorcerer(level), {}).filter((card) => card.ownerName?.includes('Wild Magic'));
  assert.deepEqual(cards(6).map((card) => card.name), ['Wild Magic Surge', 'Tides of Chaos', 'Bend Luck']);
  const all = cards(18);
  assert.deepEqual(all.map((card) => card.name), ['Wild Magic Surge', 'Tides of Chaos', 'Bend Luck', 'Tamed Surge']);
  all.forEach((card) => assert.deepEqual([...card.entries], [`${card.name} text.`]));
  assert.equal(all.some((card) => card.desc || card.detail), false);
});
