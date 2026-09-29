import { createAdapterBindings } from '../../adapterBindings.js';

const ARCANE_SHOTS = [
  'Banishing Shot', 'Beguiling Shot', 'Bursting Shot', 'Enfeebling Shot',
  'Grasping Shot', 'Piercing Shot', 'Seeking Shot', 'Shadow Shot',
];
const SHOT_LEVELS = [3, 3, 7, 10, 15, 18];

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Fighter_Arcane Archer', function (cls, level, specs) {
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
        type: 'generic_choice', from: ARCANE_SHOTS, count: 1, level: minLevel,
        descSource: 'optionalFeature',
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
    { name: 'Arcane Shot', icon: 'target', cat: 'attack', uses: 'INT mod / SR or LR', resKey: 'arcane_shot', minLevel: 3 },
    { name: 'Curving Shot', icon: 'undo-2', cat: 'bonus', uses: 'After a miss', minLevel: 7 },
    { name: 'Magical Ammunition', icon: 'sparkles', cat: 'bonus', uses: '1 / SR or LR', resKey: 'arcane_magical_ammunition', minLevel: 7 },
    { name: 'Masterful Shots', icon: 'crosshair', cat: 'reaction', uses: 'Reaction', minLevel: 18 },
  ]);
  registerSubclassSheetResources('Fighter_Arcane Archer', [
    { key: 'arcane_shot', name: 'Arcane Shot', icon: 'target', recharge: 'SR+LR', minLevel: 3,
      max: (level, { int } = {}) => Math.max(1, int ?? 0),
      die: (level) => level >= 18 ? 'd12' : level >= 15 ? 'd10' : level >= 10 ? 'd8' : 'd6', pool: true, track: 'used' },
    { key: 'arcane_magical_ammunition', name: 'Magical Ammunition', icon: 'sparkles', recharge: 'SR+LR', minLevel: 7, max: 1 },
  ]);
}
