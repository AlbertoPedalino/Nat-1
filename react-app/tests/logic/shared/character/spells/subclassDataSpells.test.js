import test from 'node:test';
import assert from 'node:assert/strict';
import { enumerateEntityGrants } from '../../../../../src/shared/character/spells/autoGrantedSpells.js';
import { classEntities } from '../../../../../src/shared/character/progression/classLevel.js';

const feyWanderer = [{ prepared: {
  3: ['charm person|xphb'], 5: ['misty step|xphb'], 9: ['summon fey|xphb'],
} }];

test("a subclass's always-prepared spells come from its data, saved on the sheet or read in the builder", () => {
  const saved = { className: 'Ranger', subclassShortName: 'Fey Wanderer', classLevel: 9, level: 9, subclassAdditionalSpells: feyWanderer };
  const [entity] = classEntities(saved);
  assert.deepEqual(enumerateEntityGrants(entity, saved).map((g) => [g.name, g.minLevel, g.subclassShortName]), [
    ['charm person', 3, 'Fey Wanderer'],
    ['misty step', 5, 'Fey Wanderer'],
    ['summon fey', 9, 'Fey Wanderer'],
  ]);
  const building = {
    className: 'Ranger', subclassShortName: 'Fey Wanderer', classLevel: 5, level: 5,
    subclasses: [{ shortName: 'Fey Wanderer', additionalSpells: feyWanderer }],
  };
  const [builderEntity] = classEntities(building);
  assert.deepEqual(enumerateEntityGrants(builderEntity, building).map((g) => g.name), ['charm person', 'misty step']);
});

test('a subclass list that depends on a choice (several entries) is left to its adapter', () => {
  const land = { className: 'Druid', subclassShortName: 'Land', classLevel: 3, level: 3, subclassAdditionalSpells: [{ prepared: { 3: ['a'] } }, { prepared: { 3: ['b'] } }] };
  const [entity] = classEntities(land);
  assert.equal(enumerateEntityGrants(entity, land).some((g) => g.name === 'a' || g.name === 'b'), false);
});

test('a class skin grants the spells of its own features, prepared with a free cast', async () => {
  const { enumerateClassDataGrants } = await import('../../../../../src/shared/character/spells/autoGrantedSpells.js');
  const entity = {
    className: 'Death Knight', level: 5,
    entry: { clsSnapshot: { skinAdditionalSpells: [{ prepared: { 2: { daily: { 1: ['rune strike|wow'] } }, 5: { daily: { 1: ['find steed|xphb'] } } } }] } },
  };
  const grants = enumerateClassDataGrants(entity);
  assert.deepEqual(grants.map((g) => g.name), ['rune strike', 'find steed']);
  assert.equal(grants[0].mode, 'prepared');
  assert.equal(grants[0].entry.freeCast.maxUses, 1);
  assert.equal(enumerateClassDataGrants({ ...entity, level: 3 }).length, 1);
});

test('a picked invocation grants its spells from its data', async () => {
  const { enumerateOptionalFeatureGrants } = await import('../../../../../src/shared/character/spells/autoGrantedSpells.js');
  const snapshots = [
    { name: 'Armor of Shadows', additionalSpells: [{ innate: { _: ['mage armor|xphb'] } }] },
    { name: 'Gift of the Depths', additionalSpells: [{ innate: { _: { daily: { '1e': ['water breathing|xphb'] } } } }] },
    { name: 'Misty Visions', additionalSpells: [{ innate: { _: ['silent image|xphb'] } }] },
  ];
  const C = {
    className: 'Warlock', level: 5, optionalFeatureSnapshots: snapshots,
    choices: { warlock_invocation_1: ['Armor of Shadows'], warlock_invocation_2: ['Gift of the Depths|XPHB'], mc0_warlock_invocation_1: ['Misty Visions'] },
  };
  const grants = enumerateOptionalFeatureGrants({ className: 'Warlock', level: 5, choicePrefix: '' }, C);
  assert.deepEqual(grants.map((g) => [g.name, g.atWill, g.explicitSource]), [
    ['mage armor', true, 'Armor of Shadows'],
    ['water breathing', false, 'Gift of the Depths'],
  ]);
  assert.equal(grants[1].entry.freeCast.maxUses, 1);
  const extra = enumerateOptionalFeatureGrants({ className: 'Warlock', level: 2, choicePrefix: 'mc0_' }, C);
  assert.deepEqual(extra.map((g) => g.name), ['silent image']);
});
