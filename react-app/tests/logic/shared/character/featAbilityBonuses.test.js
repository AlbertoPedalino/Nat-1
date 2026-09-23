import test from 'node:test';
import assert from 'node:assert/strict';
import { collectFeatAsiBonuses, getFeatAsiBonus, getAsiBonusBreakdown } from '../../../../src/shared/character/progression/abilityBonuses.js';
import { builderReducer, initialBuilderState } from '../../../../src/pages/charbuilder/state/state.js';
import { getFinalScore } from '../../../../src/pages/charbuilder/progression/calculations.js';
import { getFinal } from '../../../../src/pages/charsheet/state/calculations.js';
import { makeSheetPayload } from '../../../../src/pages/charbuilder/state/persistence.js';

// The structured ability field from the 2024 feat record, not an adapter rule.
const greatWeaponMaster = { name: 'Great Weapon Master', source: 'XPHB', ability: [{ str: 1 }], entries: [] };
const chosen = {
  scoreMethod: 'manual', manualScores: { str: 17, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  choices: { feat_asi_lv4: 'Great Weapon Master' }, allFeatSnapshots: [greatWeaponMaster],
};

test('a fixed feat bonus applies without an ASI selection in builder and sheet', () => {
  assert.deepEqual(collectFeatAsiBonuses(chosen), { str: 1 });
  assert.equal(getFinalScore(chosen, 'str'), 18);
  assert.equal(getFinal(chosen, 'str'), 18);
  assert.deepEqual(getAsiBonusBreakdown(chosen), [{ source: 'Great Weapon Master', stat: 'str', bonus: 1 }]);
});

test('fixed bonuses respect their maximum without reducing a score already above it', () => {
  for (const [base, expected] of [[19, 20], [20, 20], [22, 22]]) {
    const c = { ...chosen, manualScores: { ...chosen.manualScores, str: base } };
    assert.equal(getFinalScore(c, 'str'), expected);
    assert.equal(getFinal(c, 'str'), expected);
  }
});

test('choice-based ASIs still stack with fixed bonuses, without granting unresolved choices', () => {
  const c = { ...chosen, choices: { ...chosen.choices, feat_asi_lv8: 'Ability Score Improvement',
    feat_asi_lv8_first_asi: ['str'], feat_asi_lv8_second_asi: ['str'] },
  allFeatSnapshots: [...chosen.allFeatSnapshots, { name: 'Ability Score Improvement', ability: [{ choose: { from: ['str', 'dex'], count: 2 } }] }] };
  assert.equal(getFeatAsiBonus(c, 'str'), 3);
  assert.equal(getFinalScore(c, 'str'), 20);
  assert.equal(getFinal(c, 'str'), 20);
});

test('unselected feats and duplicate snapshots do not add ability bonuses', () => {
  assert.deepEqual(collectFeatAsiBonuses({ ...chosen, choices: {} }), {});
  assert.equal(getFeatAsiBonus({ ...chosen, allFeatSnapshots: [greatWeaponMaster, greatWeaponMaster] }, 'str'), 1);
  assert.equal(getFeatAsiBonus({ ...chosen, allFeatSnapshots: [{ name: 'Great Weapon Master', source: 'PHB', entries: [] }] }, 'str'), 0);
});

test('the same data-driven rule handles another fixed bonus and multiclass feat slots', () => {
  const c = { choices: { mc0_feat_asi_lv4: 'Durable' }, allFeatSnapshots: [{ name: 'Durable', ability: [{ con: 1 }] }] };
  assert.deepEqual(collectFeatAsiBonuses(c), { con: 1 });
});

test('selecting, saving and removing the feat updates both live builder and saved sheet', () => {
  let state = { ...initialBuilderState, character: { ...initialBuilderState.character, ...chosen, choices: {}, allFeatSnapshots: [] },
    data: { ...initialBuilderState.data, feats: [greatWeaponMaster] } };
  state = builderReducer(state, { type: 'choice/set', key: 'feat_asi_lv4', value: greatWeaponMaster.name });
  assert.equal(getFinalScore(state.character, 'str'), 18);
  const saved = makeSheetPayload(state.character, state.data);
  assert.equal(saved.finalScores.str, 18);
  assert.equal(getFinal(saved, 'str'), 18);
  state = builderReducer(state, { type: 'choice/set', key: 'feat_asi_lv4', value: null });
  assert.equal(getFinalScore(state.character, 'str'), 17);
  assert.equal(getFinal(makeSheetPayload(state.character, state.data), 'str'), 17);
});

test('loading feat data supplies fixed bonuses to an existing builder selection', () => {
  const state = builderReducer({ ...initialBuilderState, character: { ...initialBuilderState.character, ...chosen, allFeatSnapshots: [] } },
    { type: 'data/adapt', payload: { ...initialBuilderState.data, feats: [greatWeaponMaster] } });
  assert.equal(getFinalScore(state.character, 'str'), 18);
});

test('saving while only loading summaries are available keeps the selected feat ability data', () => {
  const saved = makeSheetPayload({ ...initialBuilderState.character, ...chosen },
    { ...initialBuilderState.data, feats: [{ name: greatWeaponMaster.name, category: 'General' }] });
  assert.deepEqual(saved.allFeatSnapshots[0].ability, [{ str: 1 }]);
  assert.equal(getFinal(saved, 'str'), 18);
});
