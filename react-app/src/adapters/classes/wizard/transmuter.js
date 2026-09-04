import { createAdapterBindings } from '../../adapterBindings.js';
import { addWizardSavantSpellChoices } from './wizardSavant.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Wizard_Transmuter', function (cls, level, specs) {
    addWizardSavantSpellChoices(specs, level, {
      key: 'transmuter', label: 'Transmutation', school: 'T',
    });
    if (level >= 3) {
      specs.push({
        key: 'subclass_transmuter_stone_benefit_1', label: "Transmuter's Stone - Benefit 1",
        type: 'generic_choice', from: ['Darkvision', 'Resistance', 'Speed'], count: 1, level: 3,
      });
    }
    if (level >= 10) {
      specs.push({
        key: 'subclass_transmuter_stone_benefit_2', label: "Transmuter's Stone - Benefit 2",
        type: 'generic_choice', from: ['Darkvision', 'Resistance', 'Speed', 'Mighty Build', 'Tremorsense'], count: 1, level: 10,
      });
    }
  });
  registerSubclassRuntimeConfig('Wizard_Transmuter', {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: 'Alter Self', minLevel: 3, level: 2, source: 'Wondrous Alteration', sourceType: 'subclass', freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
        { name: 'Polymorph', minLevel: 10, level: 4, source: 'Shape-Shifter', sourceType: 'subclass', freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
      ],
    },
  });

  registerSubclassSheetActions('Wizard_Transmuter', [
    { name: "Transmuter's Stone", icon: 'gem', cat: 'special', uses: 'On Long Rest', minLevel: 3, desc: 'Create a stone that grants Constitution save proficiency and the selected benefit. Change its benefit when you cast a slotted Transmutation. At level 10 it grants up to two benefits.' },
    { name: 'Empowered Transmutation', icon: 'sparkles', cat: 'special', uses: 'INT mod / LR', resKey: 'transmuter_empowered', minLevel: 6, desc: 'When a slotted Transmutation neither makes an attack roll nor forces a save, increase its effective level by 1.' },
    { name: 'Master Transmuter', icon: 'gem', cat: 'action', uses: 'Consume stone', minLevel: 14, desc: 'Consume the stone to use Major Transformation, Panacea, Restore Life, or Restore Youth. A level 7+ spell slot prevents the stone from crumbling.' },
  ]);
  registerSubclassSheetResources('Wizard_Transmuter', [
    { key: 'transmuter_empowered', name: 'Empowered Transmutation', icon: 'sparkles', recharge: 'LR', minLevel: 6, max: (level, { int } = {}) => Math.max(1, int ?? 0) },
  ]);
  registerSubclassSheetEffects('Wizard_Transmuter', [
    { type: 'reminder', minLevel: 3, note: "Transmuter's Stone always grants Constitution saving throw proficiency to its bearer." },
  ]);
}
