import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventDcLabel, eventFollowUps, eventKind, hasTableValue, isNothingFound,
} from '../../../../src/shared/gmboard/tables.js';
import { diceText, lootDetail } from '../../../../src/shared/gmboard/resultText.js';
import { resolveProceed } from '../../../../src/shared/hexcrawl/hexRules.js';
import { createDefaultTables } from '../../../../src/shared/gmboard/defaultTables.js';
import { createDefaultCoreState } from '../../../../src/shared/gmboard/defaultState.js';

test('an event row says what it is, what it chains into and which DC it asks for', () => {
  const kinds = [
    [{ type: 'encounter' }, 'encounter', ['encounter'], null],
    [{ type: 'loot' }, 'loot', ['loot'], null],
    [{ type: 'camp_nemico' }, 'camp', ['encounter', 'loot'], 'DC to spot the camp'],
    [{ type: 'other', name: 'Env. Damage/Trap' }, 'trap', ['trap'], null],
    [{ type: 'nothing' }, 'nothing', [], null],
    [{ type: 'other', name: 'Strange shrine' }, 'other', [], 'DC to interact'],
  ];
  for (const [row, kind, followUps, dc] of kinds) {
    assert.equal(eventKind(row), kind);
    assert.deepEqual(eventFollowUps(kind), followUps);
    assert.equal(eventDcLabel(kind), dc);
  }
});

test('loot rows: nothing found, values and the one-line detail', () => {
  assert.equal(isNothingFound({ type: 'Nothing found' }), true);
  assert.equal(isNothingFound(null), true);
  assert.equal(isNothingFound({ type: 'Gems' }), false);
  assert.equal(hasTableValue('—'), false);
  assert.equal(hasTableValue('Rare'), true);
  assert.equal(lootDetail({ rarity: '—' }), '');
  assert.equal(lootDetail({ rarity: 'Rare', quality: 'Fine', value: '500 gp', extra: '+ gem' }), 'Rare · Fine · 500 gp + gem');
});

test('dice text reads every stored roll shape', () => {
  assert.equal(diceText({ d8: 3, d12: 7, sum: 10 }), 'd8(3)+d12(7)=10');
  assert.equal(diceText({ d1: 4, d2: 15, sum: 19 }), 'd20(4)+d20(15)=19');
});

test('a "nothing" event in the hexcrawl rolls no DC', () => {
  const tables = createDefaultTables();
  tables.events = tables.events.map((row) => ({ ...row, name: 'Quiet', type: 'nothing' }));
  // A population threshold of 6 always triggers the event.
  const state = {
    ...createDefaultCoreState(), popThr: 6, terrain: 'Plains', terrainH: 4, hexTier: 1,
  };
  const { steps } = resolveProceed(state, tables, () => 0.5);
  assert.equal(steps.some((step) => step.kind === 'event'), true);
  assert.deepEqual(steps.filter((step) => /Dc$/.test(step.kind)), []);
});
