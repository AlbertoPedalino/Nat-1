import { createAdapterBindings } from '../../adapterBindings.js';
import { addWizardSavantSpellChoices } from '../../classAdapterHelpers.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Wizard_Necromancer', function (cls, level, specs) {
    addWizardSavantSpellChoices(specs, level, {
      key: 'necromancer', label: 'Necromancy', school: 'N',
    });
  });
  registerSubclassRuntimeConfig('Wizard_Necromancer', {
    spellcasting: {
      alwaysKnownSpells: [
        { name: 'Find Familiar', minLevel: 3, level: 1, source: 'Necromancy Spellbook', sourceType: 'subclass' },
      ],
      alwaysPreparedSpells: [{
        name: 'Animate Dead', minLevel: 6, level: 3, source: 'Undead Thralls', sourceType: 'subclass',
        freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true },
      }],
    },
  });

  registerSubclassSheetActions('Wizard_Necromancer', [
    { name: 'Harvest Undead', icon: 'heart', cat: 'reaction', uses: 'Controlled Undead', minLevel: 10 },
    { name: 'Bolster Undead', icon: 'shield-plus', cat: 'bonus', uses: '1 / LR', resKey: 'necromancer_bolster', minLevel: 14 },
    { name: 'Extinguish Undead', icon: 'burst', cat: 'special', uses: 'Special', minLevel: 14 },
  ]);
  registerSubclassSheetResources('Wizard_Necromancer', [
    { key: 'necromancer_bolster', name: 'Bolster Undead', icon: 'shield-plus', recharge: 'LR', minLevel: 14, max: 1 },
  ]);
  registerSubclassSheetEffects('Wizard_Necromancer', [
    { type: 'resistance', damageTypes: ['Necrotic'], minLevel: 3, note: 'Necromancy Spellbook' },
  ]);
}
