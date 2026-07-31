import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Alter Self (free 1/LR, no Concentration when cast this
  // way) is granted from the feat JSON additionalSpells; the adapter adds the
  // spellcasting-ability choice. Involuntary Change is a passive reminder.
  if (typeof registerFeatAdapter === 'function') {
    registerFeatAdapter('Second Skin', function (feat) {
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
          'Alter Self': {
            freeCast: { canAlsoUseSlots: true },
            modifiers: [{
              key: 'second-skin-no-concentration',
              tagLabel: 'Free Cast',
              detailTitle: 'Alternate Form',
              detailText: 'When cast without a spell slot through Second Skin, Alter Self requires no spell components or Concentration.',
            }],
          },
        },
      };
    });
  }

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Second Skin', [
      {
        name: 'Alternate Form',
        icon: 'user',
        cat: 'action',
        uses: 'Passive',
        passive: true,
        desc: 'You always have Alter Self prepared and can cast it once without a spell slot per Long Rest (or with slots you have); cast without a slot this way it requires no Concentration. Involuntary Change: after the triggering catalyst (rolled when you take the feat), at the start of your next turn make a DC 13 + PB Charisma save or immediately cast Alter Self without a slot — if already expended, you have the Stunned condition until the start of your next turn.',
      },
    ]);
  }
}
