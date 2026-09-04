import { createAdapterBindings } from '../../adapterBindings.js';

const PREPARED = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Monk_Mystic Arts', function (cls, level, specs) {
    const slots = level >= 10 ? 3 : level >= 3 ? 2 : 0;
    for (let index = 1; index <= slots; index += 1) {
      specs.push({
        key: `subclass_mystic_arts_cantrip_${index}`,
        label: `Mystic Arts - Sorcerer Cantrip ${index}`,
        type: 'spell_choice', spellFilter: { spellLevel: 0, classes: ['Sorcerer'] }, count: 1,
        level: index === 3 ? 10 : 3,
      });
    }
  });

  registerSubclassRuntimeConfig('Monk_Mystic Arts', {
    spellcasting: {
      ability: 'wis', casterProgression: '1/3', preparedMode: 'prepared',
      cantripKnown: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      preparedSpellsProgression: PREPARED,
      choiceSpellSources: {
        subclass_mystic_arts_cantrip_1: { label: 'Mystic Arts', ability: 'wis' },
        subclass_mystic_arts_cantrip_2: { label: 'Mystic Arts', ability: 'wis' },
        subclass_mystic_arts_cantrip_3: { label: 'Mystic Arts', ability: 'wis' },
      },
    },
  });
  registerSubclassSheetActions('Monk_Mystic Arts', [
    { name: 'Convert Spell Slot to Focus', icon: 'refresh-cw', cat: 'special', uses: 'Spell slot', minLevel: 6,
      desc: "Expend a spell slot without an action to regain expended Focus Points equal to the slot's level." },
    { name: 'Recover Spell Slot', icon: 'refresh-cw', cat: 'special', uses: 'Focus Points', resKey: 'ki', minLevel: 6,
      desc: 'After a Short Rest or Uncanny Metabolism, spend Focus Points to recover one slot: 2/3/5/6 Focus for a level 1/2/3/4 slot (minimum Monk levels 6/7/13/19).' },
  ]);
  registerSubclassSheetEffects('Monk_Mystic Arts', [
    { type: 'reminder', minLevel: 3, note: 'Mystic Arts spellcasting uses Wisdom and the Sorcerer spell list; an Arcane Focus can be used as the focus.' },
  ]);
}
