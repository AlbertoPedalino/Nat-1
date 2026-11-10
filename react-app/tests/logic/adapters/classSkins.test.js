import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdapterRegistry } from '../../../src/adapters/registry.js';
import { classLevel } from '../../../src/shared/character/progression/classLevel.js';
import { multiclassBlockReason } from '../../../src/pages/charbuilder/progression/multiclassRules.js';

// A class skin reads its base class's adapter entries, minus those of the
// features it replaces, plus its own.
function registryWithPaladin() {
  const registry = createAdapterRegistry();
  registry.registerClassSheetActions('Paladin', [
    { name: 'Lay on Hands', cat: 'bonus', resKey: 'lay_on_hands' },
    { name: 'Divine Sense', cat: 'action', resKey: 'paladin_channel_div' },
  ]);
  registry.registerClassRuntimeConfig('Paladin', {
    spellcasting: { ability: 'cha', alwaysPreparedSpells: [{ name: 'Divine Smite', source: "Paladin's Smite" }, { name: 'Find Steed', source: 'Faithful Steed' }] },
  });
  registry.registerClassAdapter('Paladin', (cls, lv, specs) => {
    specs.push({ key: 'paladin_fighting_style', feature: 'Fighting Style' });
    specs.push({ key: 'paladin_smite_pick', feature: "Paladin's Smite" });
  });
  registry.registerSubclassSheetActions('Paladin', 'Devotion', [{ name: 'Sacred Weapon' }]);
  registry.registerClassSkin('Death Knight', { base: 'Paladin', removedFeatures: ['Lay on Hands', "Paladin's Smite"] });
  return registry;
}

test('a Death Knight keeps Divine Sense but not Lay on Hands, and adds its own actions', () => {
  const registry = registryWithPaladin();
  registry.registerClassSheetActions('Death Knight', [{ name: 'Death Coil', cat: 'bonus' }]);
  assert.deepEqual(registry.getClassSheetActions('Death Knight').map((a) => a.name), ['Divine Sense', 'Death Coil']);
  assert.deepEqual(registry.getClassSheetActions('Paladin').map((a) => a.name), ['Lay on Hands', 'Divine Sense']);
});

test('inherited configs and choices drop the replaced features', () => {
  const registry = registryWithPaladin();
  const config = registry.getClassRuntimeConfig('Death Knight');
  assert.equal(config.spellcasting.ability, 'cha');
  assert.deepEqual(config.spellcasting.alwaysPreparedSpells.map((s) => s.name), ['Find Steed']);
  const specs = [];
  registry.getClassAdapter('Death Knight')(null, 5, specs, {});
  assert.deepEqual(specs.map((s) => s.key), ['paladin_fighting_style']);
});

test('a skin subclass reads the base subclass entries', () => {
  const registry = registryWithPaladin();
  registry.registerClassSkin('Shaman', { base: 'Barbarian' });
  registry.registerSubclassSheetActions('Barbarian', 'Berserker', [{ name: 'Frenzy' }]);
  assert.deepEqual(registry.getSubclassSheetActions('Shaman', 'Berserker').map((a) => a.name), ['Frenzy']);
  registry.registerClassSkin('Mage', { base: 'Wizard' });
  registry.registerSubclassSheetActions('Wizard', 'Evoker', [{ name: 'Overchannel' }]);
  assert.deepEqual(registry.getSubclassSheetActions('Mage', 'Evoker').map((a) => a.name), ['Overchannel']);
  assert.equal(registry.getRuleClassName('Mage'), 'Wizard');
  assert.equal(registry.getRuleClassName('Wizard'), 'Wizard');
});

const skin = (name, base) => ({ name, source: 'WoW', ruleClass: { name: base, source: 'XPHB' } });

test('a skin has the levels of its base class for every rule', () => {
  const C = { className: 'Hunter', classLevel: 5, level: 7, cls: skin('Hunter', 'Ranger'), extraClasses: [{ name: 'Druid', level: 2 }] };
  assert.equal(classLevel(C, 'Ranger'), 5);
  assert.equal(classLevel(C, 'Hunter'), 5);
  assert.equal(classLevel(C, 'Druid'), 2);
});

test('a skin cannot multiclass with its base class, either way round', () => {
  const paladinCharacter = { className: 'Paladin', classLevel: 3, level: 3, extraClasses: [] };
  assert.match(multiclassBlockReason(paladinCharacter, skin('Death Knight', 'Paladin')), /Same class/);
  const dkCharacter = { className: 'Death Knight', classLevel: 3, level: 3, cls: skin('Death Knight', 'Paladin'), extraClasses: [] };
  assert.match(multiclassBlockReason(dkCharacter, { name: 'Paladin', source: 'XPHB' }), /Same class/);
  assert.equal(multiclassBlockReason(dkCharacter, { name: 'Fighter', source: 'XPHB' }), '');
});
