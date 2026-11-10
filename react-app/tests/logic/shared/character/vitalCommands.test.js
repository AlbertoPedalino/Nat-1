import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVitalCommand } from '../../../../src/shared/character/combat/vitalCommands.js';

const apply = (data, command, max = 30) => applyVitalCommand(data, command, max);
test('damage consumes temp HP, healing caps at current derived max and clears death saves', () => {
  let v = apply({ currentHP: 20, tempHP: 5 }, { type: 'modifyHp', delta: -8 });
  assert.equal(v.currentHP, 17);
  assert.equal(v.tempHP, 0);
  v = apply({ ...v, maxHPBonus: -10, deathSaves: { fail: 2 } }, { type: 'modifyHp', delta: 100 });
  assert.equal(v.currentHP, 20);
  assert.deepEqual(v.deathSaves, { success: 0, fail: 0 });
});
test('temp HP grants keep the greater pool and long rest uses current maximum', () => {
  assert.equal(apply({ tempHP: 12 }, { type: 'grantTempHp', value: 5 }).tempHP, 12);
  const v = apply({ currentHP: 0, tempHP: 12, maxHPBonus: 4, activeConditions: ['dead', 'exhaustion'], exhaustionLevel: 1 }, { type: 'longRest' });
  assert.equal(v.currentHP, 34);
  assert.equal(v.tempHP, 0);
  assert.deepEqual(v.activeConditions, []);
});
test('death-save commands preserve the other track and a natural 20 recovers', () => {
  let v = apply({ currentHP: 0, deathSaves: { success: 1, fail: 1 } }, { type: 'setDeathSave', saveType: 'success', value: 2 });
  assert.deepEqual(v.deathSaves, { success: 2, fail: 1 });
  v = apply(v, { type: 'deathSaveRoll', roll: 20, total: 20 });
  assert.equal(v.currentHP, 1);
  assert.deepEqual(v.deathSaves, { success: 0, fail: 0 });
});
// The map sends a character's edits as the same commands as the sheet.
test('a condition toggled on the map keeps newer HP and the other conditions', () => {
  const v = apply({ currentHP: 12, activeConditions: ['blinded'] }, { type: 'toggleCombatantCondition', key: 'poisoned' });
  assert.equal(v.currentHP, 12);
  assert.deepEqual(new Set(v.activeConditions), new Set(['poisoned', 'blinded']));
});
test('taking back a third failed death save leaves the character dying at zero HP', () => {
  const v = apply(
    { currentHP: 0, activeConditions: ['dead'], deathSaves: { success: 1, fail: 3 } },
    { type: 'setDeathSave', saveType: 'fail', value: 2 },
  );
  assert.equal(v.currentHP, 0);
  assert.deepEqual(v.deathSaves, { success: 1, fail: 2 });
  assert.deepEqual(v.activeConditions, []);
});

// Reminders are a synced vital: the builder's own action names are health
// commands, set by hand and never expired.
test('reminder commands add, remove and clear without touching health', () => {
  const start = { currentHP: 12, activeConditions: ['prone'] };
  let v = apply(start, { type: 'addCombatantEffect', payload: { text: 'Guidance' } });
  assert.deepEqual(v.activeEffects, [{ key: 'custom', text: 'Guidance' }]);
  assert.equal(v.currentHP, 12);
  assert.deepEqual(v.activeConditions, ['prone']);
  v = apply(v, { type: 'addCombatantEffect', payload: { text: 'cover' } });
  assert.deepEqual(v.activeEffects, [{ key: 'custom', text: 'Guidance' }, { key: 'custom', text: 'cover' }]);
  v = apply(v, { type: 'removeCombatantEffect', effectId: 'cover' });
  assert.deepEqual(v.activeEffects, [{ key: 'custom', text: 'Guidance' }]);
  assert.deepEqual(apply(v, { type: 'clearCombatantEffects' }).activeEffects, []);
});

test('a health command keeps the reminders it did not touch', () => {
  const v = apply({ currentHP: 20, activeEffects: [{ key: 'custom', text: 'Bless' }] }, { type: 'modifyHp', delta: -5 });
  assert.equal(v.currentHP, 15);
  assert.deepEqual(v.activeEffects, [{ key: 'custom', text: 'Bless' }]);
});

// What the list used to hold as well — advantage/disadvantage calls, with a
// duration and a polarity — is dropped the next time the list is written.
test('a command drops the advantage calls an older list still carries', () => {
  const v = apply({
    currentHP: 20,
    activeEffects: [
      { key: 'selfAttackAdv', duration: 'next' },
      { key: 'custom', duration: 'next', text: 'cover', polarity: 'note' },
    ],
  }, { type: 'modifyHp', delta: -5 });
  assert.deepEqual(v.activeEffects, [{ key: 'custom', text: 'cover' }]);
});

test('a reminder removed on the map leaves the ones the sheet added meanwhile', () => {
  const v = apply(
    { activeEffects: [{ key: 'custom', text: 'Guidance' }, { key: 'custom', text: 'Bless' }] },
    { type: 'removeCombatantEffect', effectId: 'Guidance' },
  );
  assert.deepEqual(v.activeEffects, [{ key: 'custom', text: 'Bless' }]);
});
