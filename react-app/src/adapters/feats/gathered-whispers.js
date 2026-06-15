import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
    registerFeatSheetResources,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Message (no Material components) and Augury (free 1/LR)
  // are granted from the feat JSON additionalSpells; the adapter adds the
  // spellcasting-ability choice and wires Unearthly Scream's limited uses.
  if (typeof registerFeatAdapter === 'function') {
    registerFeatAdapter('Gathered Whispers', function (feat) {
      return {
        ...feat,
        choiceUi: {
          ...(feat.choiceUi && typeof feat.choiceUi === 'object' ? feat.choiceUi : {}),
          spellAbility: {
            keySuffix: 'spell_ability',
            label: 'Spellcasting Ability',
            options: [
              { value: 'int', label: 'Intelligence' },
              { value: 'wis', label: 'Wisdom' },
              { value: 'cha', label: 'Charisma' },
            ],
          },
        },
        spellGrantOverrides: {
          Message: {
            spell: { components: 'none' },
          },
          Augury: {
            freeCast: { canAlsoUseSlots: true },
            modifiers: [{
              key: 'gathered-whispers-free-components',
              tagLabel: 'Free Cast',
              detailTitle: 'Gathered Whispers',
              detailText: 'The once-per-Long-Rest casting requires no spell components.',
            }],
          },
        },
      };
    });
  }

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Gathered Whispers', [
      {
        name: 'Unearthly Scream',
        icon: 'shield',
        cat: 'reaction',
        uses: 'PB / LR',
        resKey: 'gathered_whispers_scream',
        desc: 'When you are hit by an attack roll, take a Reaction to add your Proficiency Bonus to your AC against that attack, potentially causing it to miss. Uses equal to your Proficiency Bonus, regained on a Long Rest.',
      },
    ]);
  }

  if (typeof registerFeatSheetResources === 'function') {
    registerFeatSheetResources('Gathered Whispers', [
      {
        key: 'gathered_whispers_scream',
        name: 'Unearthly Scream',
        icon: 'shield',
        recharge: 'LR',
        max: 'proficiencyBonus',
      },
    ]);
  }
}
