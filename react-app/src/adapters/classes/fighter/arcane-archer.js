import { createAdapterBindings } from '../../adapterBindings.js';
import { optionalFeatureOptions } from '../../../shared/character/progression/optionalFeatures.js';
const SHOT_LEVELS = [3, 3, 7, 10, 15, 18];

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Fighter_Arcane Archer', function (cls, level, specs, ctx = {}) {
    // The Arcane Shot options of the optional-feature data (featureType AS).
    const arcaneShots = optionalFeatureOptions(ctx.optionalFeatures, 'AS').map((option) => option.name);
    if (level >= 3) {
      specs.push({
        key: 'subclass_arcane_archer_cantrip', label: 'Arcane Archer Lore - Cantrip', type: 'spell_choice',
        spellFilter: { spellLevel: 0, allSpells: true, cantripAllowList: ['Druidcraft', 'Prestidigitation'] },
        count: 1, level: 3,
      });
    }
    SHOT_LEVELS.forEach((minLevel, index) => {
      if (level < minLevel) return;
      specs.push({
        key: `subclass_arcane_shot_${index + 1}`,
        label: `Arcane Shot Option ${index + 1}`,
        type: 'generic_choice', from: arcaneShots, count: 1, level: minLevel,
        descSource: 'optionalFeature', featureType: 'AS',
      });
    });
  });

  registerSubclassRuntimeConfig('Fighter_Arcane Archer', {
    spellcasting: {
      ability: 'int',
      choiceSpellSources: { subclass_arcane_archer_cantrip: { label: 'Arcane Archer Lore', ability: 'int' } },
    },
  });
  registerSubclassSheetProficiencies('Fighter_Arcane Archer', [
    { type: 'skill', values: ['Arcana', 'Nature'], minLevel: 3 },
  ]);
  registerSubclassSheetActions('Fighter_Arcane Archer', [
    { name: 'Arcane Shot', cat: 'special', resKey: 'arcane_shot', minLevel: 3 },
    { name: 'Curving Shot', cat: 'bonus', minLevel: 7 },
    { name: 'Magical Ammunition', cat: 'action', resKey: 'arcane_magical_ammunition', minLevel: 7 },
    { name: 'Masterful Shots', cat: 'reaction', minLevel: 18 },
  ]);
  registerSubclassSheetResources('Fighter_Arcane Archer', [
    { key: 'arcane_shot', name: 'Arcane Shot', recharge: 'SR+LR', minLevel: 3,
      max: 'abilityMod:int', minMax: 1,
      die: (level) => level >= 18 ? 'd12' : level >= 15 ? 'd10' : level >= 10 ? 'd8' : 'd6', pool: true, track: 'used' },
    { key: 'arcane_magical_ammunition', name: 'Magical Ammunition', recharge: 'SR+LR', minLevel: 7, max: 1 },
  ]);
}
