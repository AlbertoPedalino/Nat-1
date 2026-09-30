import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVitalCommand } from '../../../../src/shared/character/combat/vitalCommands.js';
import { tokenHealthCommand } from '../../../../src/shared/vtt/tokens/characterHealth.js';

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
  let v = apply({ currentHP: 0, deathSaves: { success: 1, fail: 1 } }, { type: 'setDeathSave', saveType: 's', value: 2 });
  assert.deepEqual(v.deathSaves, { success: 2, fail: 1 });
  v = apply(v, { type: 'deathSaveRoll', roll: 20, total: 20 });
  assert.equal(v.currentHP, 1);
  assert.deepEqual(v.deathSaves, { success: 0, fail: 0 });
});
test('token condition edits preserve newer HP and unrelated conditions', () => {
  const command = tokenHealthCommand({ conditions: [], hpCurrent: 30 }, { activeConditions: ['poisoned'] });
  const v = apply({ currentHP: 12, activeConditions: ['blinded'] }, command);
  assert.equal(v.currentHP, 12);
  assert.deepEqual(new Set(v.activeConditions), new Set(['poisoned', 'blinded']));
});
test('correcting a token death-save failure leaves the character at zero HP', () => {
  const command = tokenHealthCommand({ conditions: ['dead'], deathSaves: { success: 1, fail: 3 } },
    { activeConditions: [], deathSaves: { success: 1, fail: 2 } });
  const v = apply({ currentHP: 0, activeConditions: ['dead'], deathSaves: { success: 1, fail: 3 } }, command);
  assert.equal(v.currentHP, 0);
  assert.deepEqual(v.deathSaves, { success: 1, fail: 2 });
  assert.deepEqual(v.activeConditions, []);
});

// Advantage/disadvantage effects are a synced vital: the builder's own action
// names are health commands, toggled by hand and never expired.
test('effect commands toggle, add, re-time, remove and clear without touching health', () => {
  const start = { currentHP: 12, activeConditions: ['prone'] };
  let v = apply(start, { type: 'toggleCombatantEffect', key: 'selfAttackAdv' });
  assert.deepEqual(v.activeEffects, [{ key: 'selfAttackAdv', duration: 'next' }]);
  assert.equal(v.currentHP, 12);
  assert.deepEqual(v.activeConditions, ['prone']);
  v = apply(v, { type: 'addCombatantEffect', payload: { text: 'cover', polarity: 'note' } });
  v = apply(v, { type: 'setCombatantEffectDuration', effectId: 'selfAttackAdv|next|', duration: 'manual' });
  assert.deepEqual(v.activeEffects, [
    { key: 'selfAttackAdv', duration: 'manual' },
    { key: 'custom', duration: 'next', text: 'cover', polarity: 'note' },
  ]);
  v = apply(v, { type: 'removeCombatantEffect', effectId: 'custom|next|cover' });
  assert.deepEqual(v.activeEffects, [{ key: 'selfAttackAdv', duration: 'manual' }]);
  assert.deepEqual(apply(v, { type: 'clearCombatantEffects' }).activeEffects, []);
  // Toggling the same key again takes it off, whatever its duration.
  assert.deepEqual(apply(v, { type: 'toggleCombatantEffect', key: 'selfAttackAdv' }).activeEffects, []);
});

test('a health command keeps the effects it did not touch', () => {
  const v = apply({ currentHP: 20, activeEffects: [{ key: 'selfSaveDisadv', duration: 'manual' }] }, { type: 'modifyHp', delta: -5 });
  assert.equal(v.currentHP, 15);
  assert.deepEqual(v.activeEffects, [{ key: 'selfSaveDisadv', duration: 'manual' }]);
});

test('token effect edits add and remove only what the map changed', () => {
  const token = { effects: [{ key: 'selfAttackAdv', duration: 'next' }] };
  const command = tokenHealthCommand(token, { activeEffects: [{ key: 'selfCheckDisadv', duration: 'next' }] });
  assert.deepEqual(command.addEffects, [{ key: 'selfCheckDisadv', duration: 'next' }]);
  assert.deepEqual(command.removeEffects, ['selfAttackAdv|next|']);
  // One the sheet added meanwhile survives the map's edit.
  const v = apply({ activeEffects: [{ key: 'selfAttackAdv', duration: 'next' }, { key: 'selfSaveAdv', duration: 'manual' }] }, command);
  assert.deepEqual(v.activeEffects, [
    { key: 'selfSaveAdv', duration: 'manual' },
    { key: 'selfCheckDisadv', duration: 'next' },
  ]);
  assert.equal(Object.hasOwn(tokenHealthCommand(token, { currentHP: 3 }), 'addEffects'), false);
});
