import test from 'node:test';
import assert from 'node:assert/strict';
import { rollOutcome, rollLogDieColor, normalizeRollIdentity, ROLL_LOG_COLORS, rollLogCalculation } from '../../../../../src/shared/character/dice/rollLogPresentation.js';
import { normalizeRoll } from '../../../../../src/shared/vtt/rolls/rollFeed.js';
import { addRollLogEntry } from '../../../../../src/pages/encounterbuilder/rolls/rollLog.js';
import { encounterRollActor } from '../../../../../src/pages/encounterbuilder/rolls/rollActor.js';

test('only the kept natural d20 decides the result colour, regardless of total or old high/mid classes', () => {
  assert.equal(rollOutcome({ total: 24, rolls: [{ v: 20, faces: 20 }] }).color, ROLL_LOG_COLORS.nat20);
  assert.equal(rollOutcome({ total: 9, rolls: [{ v: 1, faces: 20 }] }).color, ROLL_LOG_COLORS.nat1);
  assert.equal(rollOutcome({ total: 20, cls: 'high', rolls: [{ v: 15, faces: 20 }] }).color, ROLL_LOG_COLORS.normal);
  assert.equal(rollOutcome({ cls: 'mid' }).color, ROLL_LOG_COLORS.normal);
  assert.equal(rollOutcome({ rolls: [{ v: 20, faces: 20, kept: false }, { v: 8, faces: 20, kept: true }] }).kind, 'normal');
  assert.equal(rollOutcome({ rolls: [{ v: 1, faces: 20, kept: false }] }).kind, 'normal');
  assert.equal(rollOutcome({ rolls: [{ v: 20, faces: 20 }, { v: 2, faces: 20 }] }).kind, 'normal');
});

test('damage dice and discarded dice do not acquire critical colours', () => {
  for (const die of [{ faces: 6, v: 6 }, { faces: 6, v: 1 }, { faces: 100, v: 20 }, { faces: 20, v: 20, kept: false }]) {
    assert.equal(rollLogDieColor(die), ROLL_LOG_COLORS.normal);
  }
});

test('the selected monster marker survives broadcast normalization and the encounter log', () => {
  const combat = { currentTurn: 0, combatants: [
    { id: 1, name: 'Goblin', shape: '■', shapeClr: '#3498db', label: 'A', type: 'monster' },
    { id: 2, name: 'Goblin', shape: '■', shapeClr: '#3498db', label: 'B', type: 'monster' },
  ] };
  const identity = encounterRollActor({ selectedStatblock: { combatantId: 2 }, combat });
  const shared = normalizeRoll({ ...identity, id: 'roll', label: 'Claw', rolls: [{ v: 20, faces: 20 }] });
  const local = addRollLogEntry([], shared, shared.actorName)[0];
  for (const entry of [identity, shared, local]) {
    assert.equal(entry.actorColor, '#3498db');
    assert.equal(entry.actorShape, '■');
    assert.equal(entry.actorLabel, 'B');
  }
  assert.equal(rollOutcome(local).kind, 'nat20');
});

test('generic GM and library rolls do not borrow the current monster marker; unsafe colours are ignored', () => {
  const combat = { currentTurn: 0, combatants: [{ id: 1, name: 'Goblin', shape: '■', shapeClr: '#3498db' }] };
  assert.deepEqual(encounterRollActor({}), { actorName: 'GM' });
  assert.deepEqual(encounterRollActor({ combat, selectedStatblock: { monster: { name: 'Dragon' } } }), { actorName: 'Dragon' });
  assert.equal(normalizeRollIdentity({ actorColor: 'url(https://invalid)', actorShape: '<svg>' }).actorColor, null);
});

test('single and multiple dice use the same formula and separate flat modifier', () => {
  for (const detail of ['2d4+3', '2d4 [4, 1] + 3']) {
    const layout = rollLogCalculation({ detail, total: 8, rolls: [{ v: 4, faces: 4 }, { v: 1, faces: 4 }] });
    assert.equal(layout.formula, '2d4 + 3');
    assert.equal(layout.modifier, 3);
  }
  const layout = rollLogCalculation({ mathStr: '1d10 [5] + 3', result: 8, rolls: [{ v: 5, faces: 10 }] });
  assert.equal(layout.formula, '1d10 + 3');
  assert.equal(layout.modifier, 3);
});

test('negative dice and combined modifiers stay distinct in the calculation', () => {
  const layout = rollLogCalculation({ detail: '2+1d8-1d4-5', total: 1, rolls: [{ v: 6, faces: 8 }, { v: 2, faces: 4 }] });
  assert.deepEqual(layout.dice.map((die) => die.sign), [1, -1]);
  assert.equal(layout.modifier, -3);
});

test('advantage excludes the discarded die when recovering a legacy modifier', () => {
  const layout = rollLogCalculation({ mathStr: 'Advantage: keep 17; d20 +5 = 22', result: 22, rolls: [
    { v: 2, faces: 20, kept: false }, { v: 17, faces: 20, kept: true },
  ] });
  assert.equal(layout.modifier, 5);
  assert.equal(layout.formula, 'd20 + 5');
  assert.equal(layout.modeLabel, 'ADV');
});

test('entries without structured dice retain their original detail', () => {
  assert.equal(rollLogCalculation({ mathStr: '1d10 [5] + 3', result: 8 }).formula, '1d10 [5] + 3');
  assert.equal(rollLogCalculation({ detail: 'Rest complete', total: null }).total, undefined);
});
