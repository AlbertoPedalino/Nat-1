import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateDifficulty } from './difficulty.js';
import {
  applySheetVitals,
  buildCombat,
  modifyHp,
  nextTurn,
  restoreFight,
  setDeathSave,
  setTempHp,
  snapshotFight,
} from './combat.js';
import { rollDice, rollDiceFormula } from './dice.js';
import { cleanToText, parseCleanTokens } from './markup.js';
import { resolveLegendaryGroups } from './bestiary.js';
import {
  SYNCED_DATA_KEYS,
  combatantToSheetPatch,
  sheetPatchKey,
  sheetVitalsToCombat,
  sheetVitalsToSheetPatch,
} from './sheetSync.js';

test('synced field set matches the patch_character_data SQL allowlist', () => {
  const sql = readFileSync(new URL('../../../../supabase/combat_sync.sql', import.meta.url), 'utf8');
  const match = sql.match(/allowed\s+text\[\]\s*:=\s*array\[([^\]]+)\]/);
  assert.ok(match, 'could not find the allowed[] array in combat_sync.sql');
  const sqlKeys = match[1].split(',').map((part) => part.trim().replace(/^'|'$/g, ''));
  assert.deepEqual([...sqlKeys].sort(), [...SYNCED_DATA_KEYS].sort());
});

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

test('sheet sync mappers clamp and keep the sheet patch shallow', () => {
  assert.deepEqual(sheetVitalsToCombat({
    currentHP: 99,
    maxHP: 12,
    tempHP: '7',
    deathSaves: { success: 5, fail: -2 },
  }), {
    hpMax: 12,
    hpCurrent: 12,
    tempHP: 7,
    maxHPBonus: 0,
    deathSaves: { s: 3, f: 0 },
  });

  const patch = combatantToSheetPatch({
    hpCurrent: -4,
    hpMax: 22,
    tempHP: 3,
    deathSaves: { s: 2, f: 9 },
  });
  assert.deepEqual(patch, {
    currentHP: 0,
    tempHP: 3,
    maxHPBonus: 0,
    deathSaves: { success: 2, fail: 3 },
  });
  assert.equal(Object.hasOwn(patch, 'maxHP'), false);
  assert.deepEqual(sheetVitalsToSheetPatch({
    currentHP: 40,
    maxHP: 18,
    tempHP: '2',
    deathSaves: { success: 1, fail: 9 },
  }), {
    currentHP: 18,
    tempHP: 2,
    maxHPBonus: 0,
    deathSaves: { success: 1, fail: 3 },
  });
  assert.equal(sheetPatchKey(patch), sheetPatchKey({
    deathSaves: { fail: 3, success: 2 },
    tempHP: 3,
    maxHPBonus: 0,
    currentHP: 0,
  }));
});

test('combat launch seeds linked players from sheet current HP and death saves', () => {
  const combat = buildCombat([], [{
    name: 'Aria',
    sourceId: 'char-1',
    campaignId: 'camp-1',
    initMod: 1,
    ac: 15,
    hpMax: 22,
    currentHP: 7,
    tempHP: 4,
    deathSaves: { success: 2, fail: 1 },
  }], 123, () => 0);

  assert.equal(combat.combatants.length, 1);
  assert.equal(combat.combatants[0].hpCurrent, 7);
  assert.equal(combat.combatants[0].tempHP, 4);
  assert.deepEqual(combat.combatants[0].deathSaves, { s: 2, f: 1 });
});

test('temp HP mutator clamps and fight snapshots preserve temp HP', () => {
  const combat = {
    fightId: 42,
    combatants: [{
      id: 1,
      name: 'Aria',
      type: 'player',
      sourceId: 'char-1',
      initiative: 10,
      initMod: 1,
      hpCurrent: 8,
      hpMax: 12,
      tempHP: 5,
      ac: 15,
      deathSaves: { s: 0, f: 0 },
      isDead: false,
    }],
    currentTurn: 0,
    round: 1,
  };
  const clamped = setTempHp(combat, 1, -12);
  assert.equal(clamped.combatants[0].tempHP, 0);

  const restored = restoreFight({ id: 42, fight: snapshotFight(setTempHp(combat, 1, 9)) }, []);
  assert.equal(restored.combatants[0].tempHP, 9);
});

test('applySheetVitals syncs linked PCs with max HP reclamp and idempotence', () => {
  const combat = {
    combatants: [
      {
        id: 1,
        type: 'player',
        sourceId: 'char-1',
        hpCurrent: 18,
        hpMax: 20,
        tempHP: 3,
        deathSaves: { s: 0, f: 0 },
        isDead: false,
      },
      {
        id: 2,
        type: 'player',
        sourceId: null,
        hpCurrent: 6,
        hpMax: 6,
        tempHP: 0,
        deathSaves: { s: 0, f: 0 },
        isDead: false,
      },
    ],
    currentTurn: 0,
    round: 1,
  };

  const synced = applySheetVitals(combat, 'char-1', {
    currentHP: 99,
    maxHP: 12,
    tempHP: -4,
    deathSaves: { success: 2, fail: 4 },
  });
  assert.equal(synced.combatants[0].hpMax, 12);
  assert.equal(synced.combatants[0].hpCurrent, 12);
  assert.equal(synced.combatants[0].tempHP, 0);
  assert.deepEqual(synced.combatants[0].deathSaves, { s: 2, f: 3 });
  assert.equal(synced.combatants[0].isDead, false);
  assert.equal(synced.combatants[1], combat.combatants[1]);

  const failed = applySheetVitals(synced, 'char-1', {
    currentHP: 0,
    maxHP: 12,
    tempHP: 5,
    deathSaves: { fail: 3 },
  });
  assert.equal(failed.combatants[0].isDead, true);
  assert.equal(applySheetVitals(failed, 'char-1', {
    currentHP: 0,
    maxHP: 12,
    tempHP: 5,
    deathSaves: { fail: 3 },
  }), failed);
  assert.equal(applySheetVitals(failed, 'missing', { currentHP: 7, maxHP: 7 }), failed);
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
