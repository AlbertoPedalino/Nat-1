import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateDifficulty } from './difficulty.js';
import {
  applySheetVitals,
  buildCombat,
  clearCombatantConditions,
  modifyHp,
  nextTurn,
  restoreFight,
  setDeathSave,
  setTempHp,
  snapshotFight,
  toggleCombatantCondition,
} from './combat.js';
import { rollDice, rollDiceFormula } from './dice.js';
import {
  buildFumbleFormula,
  createDefaultFumbleTables,
  fumbleResultValues,
  getFumbleRange,
  normalizeFumbleTables,
} from './fumbles.js';
import {
  createDefaultNegotiation,
  negotiationStatus,
  normalizeNegotiation,
  resolveNegotiation,
} from './negotiation.js';
import { cleanToText, parseCleanTokens } from './markup.js';
import { resolveLegendaryGroups } from './bestiary.js';
import {
  SYNCED_DATA_KEYS,
  combatantToSheetPatch,
  resolveCombatVitals,
  sheetPatchKey,
  sheetVitalsToCombat,
  sheetVitalsToSheetPatch,
} from './sheetSync.js';
import { createInitialState, encounterReducer } from '../state/reducer.js';
import { SYNCED_VITALS } from '../../../shared/character/vitals.js';
import { toEncounterPlayer } from './campaignPlayer.js';

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
  // A party member typed into the encounter carries hpMax and nothing else:
  // launching the fight must start them undamaged, not at 0 HP.
  const aria = combat.combatants.find((c) => c.name === 'Aria');
  assert.equal(aria.hpCurrent, 22);
  assert.equal(aria.hpMax, 22);
  assert.equal(aria.isDead, false);
  const current = combat.combatants[combat.currentTurn];
  const deadCombat = { ...combat, combatants: combat.combatants.map((c) => (c.id === current.id ? { ...c, isDead: true } : c)) };
  const advanced = nextTurn(deadCombat);
  assert.notEqual(advanced.combatants[advanced.currentTurn].id, current.id);
});

test('vitals resolve to full HP when no current HP is known anywhere', () => {
  // Number(null) === 0, so an absent current HP used to survive the clamp as a
  // finite 0 and beat the hpMax fallback.
  assert.equal(resolveCombatVitals({ hpMax: 30 }, { hpMax: 30 }).hpCurrent, 30);
  assert.equal(resolveCombatVitals({}, {}).hpCurrent, 10); // no hpMax anywhere -> default 10
  // A known current HP still wins, including a legitimate 0.
  assert.equal(resolveCombatVitals({ hpMax: 30 }, { hpMax: 30, currentHP: 4 }).hpCurrent, 4);
  assert.equal(resolveCombatVitals({ hpMax: 30 }, { hpMax: 30, currentHP: 0 }).hpCurrent, 0);
  // Combatant-side value is the fallback when inbound vitals omit it.
  assert.equal(resolveCombatVitals({ hpMax: 30, hpCurrent: 12 }, {}).hpCurrent, 12);
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
    // null, not []: this payload carries no opinion about conditions, and the
    // difference is what stops it from wiping the combat's own.
    activeConditions: null,
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
    activeConditions: [],
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
    activeConditions: [],
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

test('fumble tables start as editable 1d6 categories with the supplied entries', () => {
  const tables = createDefaultFumbleTables();
  assert.deepEqual(Object.keys(tables), ['melee', 'spell', 'social', 'skillExploration']);
  assert.deepEqual(tables.melee.dice, { 6: 1 });
  assert.deepEqual(fumbleResultValues(tables.spell.dice), [1, 2, 3, 4, 5, 6]);
  assert.equal(tables.spell.entries[3], 'Wrong target.');
  assert.equal(tables.spell.entries[4], 'Half effect.');
  assert.equal(tables.skillExploration.entries[6], "You're stuck for 1 round.");
});

test('fumble dice combinations derive the correct minimum, maximum, and formula', () => {
  const dice = { 6: 2, 8: 1 };
  assert.equal(buildFumbleFormula(dice), '2d6+1d8');
  assert.deepEqual(getFumbleRange(dice), { min: 3, max: 20, count: 18 });
  assert.deepEqual(fumbleResultValues({ 4: 3 }), [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('normalizing saved fumbles preserves hidden and deliberately blank entries', () => {
  const tables = normalizeFumbleTables({
    melee: {
      dice: { 6: 2 },
      entries: { 1: 'Hidden but preserved', 2: '', 12: 'Maximum' },
    },
  });
  assert.deepEqual(tables.melee.dice, { 6: 2 });
  assert.equal(tables.melee.entries[1], 'Hidden but preserved');
  assert.equal(tables.melee.entries[2], '');
  assert.equal(tables.melee.entries[12], 'Maximum');
  assert.equal(tables.spell.entries[1], 'The spell hits a random creature in range.');
});

test('fumble reducer edits dice and entries and can reset one category', () => {
  let state = createInitialState();
  state = encounterReducer(state, {
    type: 'setFumbleDice',
    categoryId: 'social',
    dice: { 6: 2, 8: 1 },
  });
  state = encounterReducer(state, {
    type: 'setFumbleEntry',
    categoryId: 'social',
    result: 20,
    value: 'A custom consequence.',
  });
  assert.equal(buildFumbleFormula(state.fumbleTables.social.dice), '2d6+1d8');
  assert.equal(state.fumbleTables.social.entries[20], 'A custom consequence.');

  state = encounterReducer(state, { type: 'resetFumbleCategory', categoryId: 'social' });
  assert.deepEqual(state.fumbleTables.social.dice, { 6: 1 });
  assert.equal(state.fumbleTables.social.entries[6], 'The worst possible person overhears.');
  assert.equal(state.fumbleTables.social.entries[20], undefined);
});

test('negotiation attitudes use the configured initial patience and interest', () => {
  assert.deepEqual(createDefaultNegotiation('hostile'), {
    attitude: 'hostile',
    threshold: null,
    patience: 2,
    interest: 1,
  });
  assert.deepEqual(createDefaultNegotiation('neutral'), {
    attitude: 'neutral',
    threshold: null,
    patience: 3,
    interest: 2,
  });
  assert.deepEqual(createDefaultNegotiation('friendly'), {
    attitude: 'friendly',
    threshold: null,
    patience: 4,
    interest: 3,
  });
});

test('negotiation checks apply standard and critical deltas with bounded meters', () => {
  const neutral = createDefaultNegotiation('neutral', 15);
  assert.deepEqual(resolveNegotiation(neutral, 'passed'), {
    ...neutral,
    interest: 3,
  });
  assert.deepEqual(resolveNegotiation(neutral, 'failed'), {
    ...neutral,
    patience: 2,
    interest: 1,
  });
  assert.deepEqual(resolveNegotiation(neutral, 'criticalSuccess'), {
    ...neutral,
    interest: 5,
  });
  assert.deepEqual(resolveNegotiation(neutral, 'criticalFailure'), {
    ...neutral,
    patience: 1,
    interest: 1,
  });
});

test('negotiation concludes at zero patience or five interest and then stops changing', () => {
  const noPatience = resolveNegotiation(createDefaultNegotiation('hostile'), 'criticalFailure');
  assert.deepEqual(negotiationStatus(noPatience), {
    ended: true,
    reason: 'Patience exhausted.',
    result: 'No, with negative consequences.',
  });
  assert.deepEqual(resolveNegotiation(noPatience, 'criticalSuccess'), noPatience);

  const maxInterest = resolveNegotiation(createDefaultNegotiation('friendly'), 'criticalSuccess');
  assert.equal(maxInterest.interest, 5);
  assert.deepEqual(negotiationStatus(maxInterest), {
    ended: true,
    reason: 'Maximum interest reached.',
    result: 'Yes, with positive consequences.',
  });
});

test('negotiation reducer preserves threshold across attitude changes and reset', () => {
  let state = createInitialState();
  state = encounterReducer(state, { type: 'setNegotiationThreshold', value: 17 });
  state = encounterReducer(state, { type: 'setNegotiationAttitude', attitude: 'hostile' });
  assert.deepEqual(state.negotiation, {
    attitude: 'hostile',
    threshold: 17,
    patience: 2,
    interest: 1,
  });
  state = encounterReducer(state, { type: 'resolveNegotiation', outcome: 'passed' });
  assert.equal(state.negotiation.interest, 2);
  state = encounterReducer(state, { type: 'resetNegotiation' });
  assert.deepEqual(state.negotiation, {
    attitude: 'hostile',
    threshold: 17,
    patience: 2,
    interest: 1,
  });
  assert.equal(normalizeNegotiation({ attitude: 'friendly', threshold: 500 }).threshold, 99);
});

test('campaign-imported players can be removed from the encounter party', () => {
  let state = createInitialState();
  state = encounterReducer(state, {
    type: 'importCampaignPlayers',
    players: [
      { sourceId: 'char-1', campaignId: 'camp-1', name: 'Aria', level: 5, initMod: 2, ac: 15, hpMax: 30 },
      { sourceId: 'char-2', campaignId: 'camp-1', name: 'Borin', level: 5, initMod: 0, ac: 18, hpMax: 42 },
    ],
  });

  state = encounterReducer(state, { type: 'removePlayer', index: 0 });

  assert.deepEqual(state.players.map((player) => player.sourceId), ['char-2']);
  assert.equal(state.party.count, 1);
  assert.match(state.campaignNotice, /Aria removed from encounter/);
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

function combatWithOneCombatant(activeConditions = []) {
  const combat = buildCombat([], [{ name: 'Aria', initMod: 1, ac: 15, hpMax: 22 }], 1, () => 0.5);
  return {
    ...combat,
    combatants: combat.combatants.map((c) => ({ ...c, activeConditions })),
  };
}

test('combatants start a fight with no conditions', () => {
  const monster = { name: 'Goblin', cr: '1/4', hp: { average: 7 }, ac: 15, dex: 14 };
  const combat = buildCombat([{ qty: 1, monsterData: monster }], [{ name: 'Aria', hpMax: 22 }], 1, () => 0.5);
  for (const combatant of combat.combatants) {
    assert.deepEqual(combatant.activeConditions, [], `${combatant.name} started with conditions`);
  }
});

test('assigning a condition to a combatant applies its implied conditions', () => {
  const combat = combatWithOneCombatant();
  const id = combat.combatants[0].id;
  const next = toggleCombatantCondition(combat, id, 'unconscious');
  assert.deepEqual(next.combatants[0].activeConditions, ['incapacitated', 'prone', 'unconscious']);
});

test('toggling a condition twice removes it and leaves the rest of the fight alone', () => {
  const combat = combatWithOneCombatant();
  const id = combat.combatants[0].id;
  const on = toggleCombatantCondition(combat, id, 'poisoned');
  const off = toggleCombatantCondition(on, id, 'poisoned');
  assert.deepEqual(off.combatants[0].activeConditions, []);
  assert.equal(off.round, combat.round);
  assert.equal(off.currentTurn, combat.currentTurn);
});

// Exhaustion is graded and its level lives on the sheet, which the encounter
// does not sync. If a combat could drop the key, a round-trip would leave a
// player with an exhaustion level and nothing showing it.
test('a combat can neither set nor clear a synced exhaustion', () => {
  const combat = combatWithOneCombatant(['exhaustion', 'poisoned']);
  const id = combat.combatants[0].id;

  assert.equal(toggleCombatantCondition(combat, id, 'exhaustion'), combat);
  assert.deepEqual(clearCombatantConditions(combat, id).combatants[0].activeConditions, ['exhaustion']);
});

test('clearing conditions drops everything the encounter can set', () => {
  const combat = combatWithOneCombatant(['poisoned', 'prone', 'blinded']);
  const id = combat.combatants[0].id;
  assert.deepEqual(clearCombatantConditions(combat, id).combatants[0].activeConditions, []);
});

test('conditions ride the sheet sync so a GM call lands on the player sheet', () => {
  const patch = combatantToSheetPatch({ hpCurrent: 5, hpMax: 22, activeConditions: ['prone', 'prone', 'bogus'] });
  assert.deepEqual(patch.activeConditions, ['prone']);
  assert.deepEqual(sheetVitalsToCombat({ maxHP: 22, activeConditions: ['blinded'] }).activeConditions, ['blinded']);
});

test('a condition change is not mistaken for an echo of our own save', () => {
  const base = { currentHP: 5, tempHP: 0, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: ['prone'] };
  assert.equal(sheetPatchKey(base), sheetPatchKey({ ...base, activeConditions: ['prone'] }));
  assert.notEqual(sheetPatchKey(base), sheetPatchKey({ ...base, activeConditions: ['prone', 'blinded'] }));
});

// A live sheet payload that says nothing about conditions must not be read as
// "no conditions". This wiped a GM's call the moment their own write echoed
// back through realtime.
test('vitals that omit conditions leave the combatant\'s own in place', () => {
  const combatant = { hpMax: 22, hpCurrent: 22, activeConditions: ['prone'] };
  assert.deepEqual(resolveCombatVitals(combatant, { hpMax: 22 }).activeConditions, ['prone']);
  assert.deepEqual(resolveCombatVitals(combatant, { hpMax: 22, currentHP: 10 }).activeConditions, ['prone']);
});

// An empty array is a real value: clearing every condition on the sheet has to
// reach the combat.
test('vitals carrying an empty condition list do clear the combatant', () => {
  const combatant = { hpMax: 22, hpCurrent: 22, activeConditions: ['prone'] };
  assert.deepEqual(resolveCombatVitals(combatant, { hpMax: 22, activeConditions: [] }).activeConditions, []);
});

test('inbound sheet conditions reach a linked player combatant', () => {
  const combat = buildCombat([], [{ name: 'Aria', sourceId: 'char-1', hpMax: 22 }], 1, () => 0.5);
  const synced = applySheetVitals(combat, 'char-1', { hpMax: 22, currentHP: 22, activeConditions: ['blinded'] });
  assert.deepEqual(synced.combatants[0].activeConditions, ['blinded']);

  // ...and an unrelated later update does not undo them.
  const afterHp = applySheetVitals(synced, 'char-1', { hpMax: 22, currentHP: 9 });
  assert.deepEqual(afterHp.combatants[0].activeConditions, ['blinded']);
  assert.equal(afterHp.combatants[0].hpCurrent, 9);
});

// The fight is snapshotted and restored on every persist cycle, so a field the
// snapshot forgets is a field the combat silently loses moments after it is set.
test('conditions survive a fight snapshot and restore', () => {
  const combat = buildCombat([], [{ name: 'Aria', sourceId: 'char-1', hpMax: 22 }], 1, () => 0.5);
  const id = combat.combatants[0].id;
  const withCondition = toggleCombatantCondition(combat, id, 'restrained');

  const restored = restoreFight({ id: 1, fight: snapshotFight(withCondition) }, []);
  assert.deepEqual(restored.combatants[0].activeConditions, ['restrained']);
});

test('a fight saved before conditions existed restores with an empty list', () => {
  const legacy = { id: 1, fight: { combatants: [{ id: 0, name: 'Aria', type: 'player', hpCurrent: 5, hpMax: 22 }], currentTurn: 0, round: 1 } };
  assert.deepEqual(restoreFight(legacy, []).combatants[0].activeConditions, []);
});

// The guard the sync chain was missing. Three separate surfaces each enumerated
// the synced fields by hand, and each silently dropped `activeConditions` — the
// field was declared, mapped, allowed through the database, and still lost.
// This fails on the next field that any of them forgets.
test('a fight snapshot persists and restores every synced vital', () => {
  const combatant = {
    id: 0,
    type: 'player',
    name: 'Aria',
    sourceId: 'char-1',
    initiative: 12,
    ac: 15,
    hpMax: 22,
    hpCurrent: 9,
    tempHP: 3,
    maxHPBonus: 2,
    deathSaves: { s: 1, f: 2 },
    activeConditions: ['prone', 'poisoned'],
  };

  const saved = snapshotFight({ combatants: [combatant], currentTurn: 0, round: 2 }).combatants[0];
  const restored = restoreFight({ id: 1, fight: { combatants: [saved], currentTurn: 0, round: 2 } }, []).combatants[0];

  for (const field of SYNCED_VITALS) {
    assert.ok(field.combat in saved, `${field.combat} is missing from the fight snapshot`);
    assert.ok(field.combat in restored, `${field.combat} is missing after restore`);
  }
  assert.equal(restored.hpCurrent, 9);
  assert.equal(restored.tempHP, 3);
  assert.equal(restored.maxHPBonus, 2);
  assert.deepEqual(restored.deathSaves, { s: 1, f: 2 });
  assert.deepEqual(restored.activeConditions, ['poisoned', 'prone']);
});

// A monster is dead at 0 HP and has no death saves to fail, so the snapshot must
// keep its own flag rather than re-deriving it from the vitals.
test('a snapshot keeps a dead monster dead', () => {
  const monster = { id: 1, type: 'monster', name: 'Goblin', hpMax: 7, hpCurrent: 0, isDead: true };
  assert.equal(snapshotFight({ combatants: [monster] }).combatants[0].isDead, true);
});

// Importing a campaign roster is a sixth surface that used to hand-list the
// synced fields, so a player arrived in the fight without the conditions their
// sheet already showed.
const CAMPAIGN_ROW = {
  id: 'char-1',
  name: 'Aria',
  updated_at: '2026-01-01',
  data: {
    name: 'Aria',
    maxHP: 22,
    currentHP: 9,
    tempHP: 3,
    deathSaves: { success: 1, fail: 2 },
    activeConditions: ['prone', 'blinded'],
  },
};

test('an imported campaign player carries every synced vital', () => {
  const player = toEncounterPlayer(CAMPAIGN_ROW, { id: 'camp-1', name: 'Camp' });

  for (const key of SYNCED_DATA_KEYS) {
    assert.ok(key in player, `${key} is missing from an imported campaign player`);
  }
  assert.deepEqual(player.activeConditions, ['blinded', 'prone']);
  assert.equal(player.tempHP, 3);
  assert.deepEqual(player.deathSaves, { success: 1, fail: 2 });
  assert.equal(player.sourceId, 'char-1');
});

test('launching a fight keeps an imported player conditions', () => {
  const player = toEncounterPlayer(CAMPAIGN_ROW, { id: 'camp-1', name: 'Camp' });
  const combat = buildCombat([], [player], 1, () => 0.5);

  assert.deepEqual(combat.combatants[0].activeConditions, ['blinded', 'prone']);
});
