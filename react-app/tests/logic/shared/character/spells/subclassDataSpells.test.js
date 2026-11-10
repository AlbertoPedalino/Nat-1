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
