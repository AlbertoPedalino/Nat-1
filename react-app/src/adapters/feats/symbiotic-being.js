import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatSheetActions,
    registerFeatSheetResources,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Skill and language proficiencies are parsed from the feat
  // JSON; Sustained Symbiosis is a limited-use Reaction that spends a Hit Die.
  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Symbiotic Being', [
      {
        name: 'Sustained Symbiosis',
        icon: 'heart',
        cat: 'reaction',
        uses: 'PB / LR',
        resKey: 'symbiotic_sustain',
        desc: 'When you fail a saving throw, take a Reaction and expend one of your Hit Dice; roll the die and add the number rolled to the save, potentially turning the failure into a success. Uses equal to your Proficiency Bonus, regained on a Long Rest. (Symbiotic Agenda: after you roll a 1 on a D20 Test, make a DC 13 + PB Charisma save or be Charmed by your symbiote for 1d12 hours, repeating the save whenever you take damage.)',
      },
    ]);
  }

  if (typeof registerFeatSheetResources === 'function') {
    registerFeatSheetResources('Symbiotic Being', [
      {
        key: 'symbiotic_sustain',
        name: 'Sustained Symbiosis',
        icon: 'heart',
        recharge: 'LR',
        max: 'proficiencyBonus',
      },
    ]);
  }
}
