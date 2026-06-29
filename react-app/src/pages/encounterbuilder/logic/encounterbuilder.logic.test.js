import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDifficulty } from './difficulty.js';
import { buildCombat, modifyHp, nextTurn, setDeathSave } from './combat.js';
import { rollDice, rollDiceFormula } from './dice.js';
import { cleanToText, parseCleanTokens } from './markup.js';
import { resolveLegendaryGroups } from './bestiary.js';

test('difficulty uses raw monster XP without encounter multiplier', () => {
  const result = calculateDifficulty([{ xp: 200, qty: 2 }], { count: 4, level: 1 });
  assert.equal(result.totalXp, 400);
  assert.equal(result.label, 'High');
  assert.deepEqual(result.thresholds, [200, 300, 400, 600]);
});

test('combat initiative builds monsters and players then skips dead on next turn', () => {
  const rolls = [0, 0.95, 0.2];
  const rng = () => rolls.shift() ?? 0;
  const monster = { name: 'Skeleton', source: 'XMM', dex: 14, ac: [13], hp: { average: 13 } };
  const combat = buildCombat([{ qty: 2, monsterData: monster }], [{ name: 'Aria', initMod: 1, ac: 15, hpMax: 22 }], 123, rng);
  assert.equal(combat.combatants.length, 3);
  assert.equal(combat.round, 1);
  const current = combat.combatants[combat.currentTurn];
  const deadCombat = { ...combat, combatants: combat.combatants.map((c) => (c.id === current.id ? { ...c, isDead: true } : c)) };
  const advanced = nextTurn(deadCombat);
  assert.notEqual(advanced.combatants[advanced.currentTurn].id, current.id);
});

test('hp and death saves preserve player death-save flow', () => {
  const combat = {
    combatants: [{ id: 1, type: 'player', hpCurrent: 5, hpMax: 10, deathSaves: { s: 0, f: 0 }, isDead: false }],
    currentTurn: 0,
    round: 1,
  };
  const down = modifyHp(combat, 1, -10);
  assert.equal(down.combatants[0].hpCurrent, 0);
  assert.equal(down.combatants[0].isDead, false);
  const failed = setDeathSave(setDeathSave(setDeathSave(down, 1, 'f', 1), 1, 'f', 2), 1, 'f', 3);
  assert.equal(failed.combatants[0].isDead, true);
  const healed = modifyHp(failed, 1, 4);
  assert.deepEqual(healed.combatants[0].deathSaves, { s: 0, f: 0 });
  assert.equal(healed.combatants[0].isDead, false);
});

test('dice parses formulas and d20 modifiers', () => {
  const rng = () => 0;
  assert.deepEqual(rollDiceFormula('2d6+3', rng), {
    result: 5,
    maxResult: 15,
    naturalD20: null,
    mathStr: '2d6 [1, 1] + 3',
  });
  const attack = rollDice('+5', 'Attack', rng);
  assert.equal(attack.result, 6);
  assert.equal(attack.naturalD20, 1);
  assert.equal(attack.cls, 'nat1');
});

test('markup converts 5etools tags into safe tokens', () => {
  const tokens = parseCleanTokens('Hit: {@hit 7}, damage {@damage 2d6+3}, spell {@spell fireball|xphb|Fireball}.');
  assert.equal(tokens.some((token) => token.type === 'roll' && token.notation === '+7'), true);
  assert.equal(tokens.some((token) => token.type === 'roll' && token.notation === '2d6+3'), true);
  assert.equal(tokens.some((token) => token.type === 'link' && token.text === 'Fireball'), true);
  assert.equal(cleanToText('{@actSave dex} {@actSaveFail 1}'), 'Dexterity Saving Throw: Failure 1:');
});

test('legendary group copy inheritance applies array mods', () => {
  const groups = resolveLegendaryGroups({
    legendaryGroup: [
      { name: 'Base', source: 'XMM', lairActions: ['a'], regionalEffects: ['b'] },
      {
        name: 'Child',
        source: 'XMM',
        _copy: {
          name: 'Base',
          source: 'XMM',
          _mod: { lairActions: { mode: 'appendArr', items: ['c'] } },
        },
      },
    ],
  });
  assert.deepEqual(groups.get('XMM__Child').lairActions, ['a', 'c']);
  assert.deepEqual(groups.get('XMM__Child').regionalEffects, ['b']);
});
