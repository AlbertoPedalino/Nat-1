import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
    registerFeatSheetResources,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Mage Hand (no components) is granted from the feat JSON;
  // the adapter adds the spellcasting-ability choice and wires Lengthened Strike.
  if (typeof registerFeatAdapter === 'function') {
    registerFeatAdapter('Living Shadow', function (feat) {
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
          'Mage Hand': {
            spell: { components: 'none' },
          },
        },
      };
    });
  }

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Living Shadow', [
      {
        name: 'Lengthened Strike',
        icon: 'sword',
        cat: 'special',
        uses: 'PB / LR',
        resKey: 'living_shadow_reach',
        desc: 'When you make a melee attack roll as part of the Attack or Magic action on your turn, you can increase your reach for that attack by 10 feet as your shadow stretches. Uses equal to your Proficiency Bonus, regained on a Long Rest. (Ominous Will: after you roll a 1 on a D20 Test, make a DC 13 + PB Wisdom save or be Incapacitated until the start of your next turn and roll on the Shadow\'s Will table.)',
      },
    ]);
  }

  if (typeof registerFeatSheetResources === 'function') {
    registerFeatSheetResources('Living Shadow', [
      {
        key: 'living_shadow_reach',
        name: 'Lengthened Strike',
        icon: 'sword',
        recharge: 'LR',
        max: 'proficiencyBonus',
      },
    ]);
  }
}
