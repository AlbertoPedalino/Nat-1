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
    { name: 'Harvest Undead', icon: 'heart', cat: 'reaction', uses: 'Controlled Undead', minLevel: 10, desc: 'After damage makes you Bloodied without reducing you to 0 HP, reduce a visible Undead you control to 0 HP and regain HP equal to your Wizard level.' },
    { name: 'Bolster Undead', icon: 'shield-plus', cat: 'bonus', uses: '1 / LR', resKey: 'necromancer_bolster', minLevel: 14, desc: 'Undead you created or summoned with Necromancy spells within 60 feet gain Temporary HP equal to your Wizard level.' },
    { name: 'Extinguish Undead', icon: 'burst', cat: 'special', uses: 'Special', minLevel: 14, desc: 'When a visible Undead reaches 0 HP, explode it in a 10-foot Emanation. For an uncontrolled Undead, use a Reaction and a level 5+ spell slot.' },
  ]);
  registerSubclassSheetResources('Wizard_Necromancer', [
    { key: 'necromancer_bolster', name: 'Bolster Undead', icon: 'shield-plus', recharge: 'LR', minLevel: 14, max: 1 },
  ]);
  registerSubclassSheetEffects('Wizard_Necromancer', [
    { type: 'resistance', damageTypes: ['Necrotic'], minLevel: 3, note: 'Necromancy Spellbook' },
    { type: 'reminder', minLevel: 6, note: 'Grave Power: Arcane Recovery reduces Exhaustion by 1; Wizard spells/features ignore Necrotic Resistance.' },
    { type: 'reminder', minLevel: 6, note: 'Undead Thralls: summoned/created Undead gain HP and damage bonuses based on INT and Wizard level.' },
  ]);
}
