import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatSheetActions,
    registerFeatSheetResources,
  } = createAdapterBindings(registry, context);

  // Origin feat. Hypervigilance is passive (reroll Initiative if 9 or lower);
  // Steel Yourself is a 1/LR Reaction.
  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Survivor', [
      {
        name: 'Steel Yourself',
        icon: 'shield',
        cat: 'reaction',
        uses: '1 / LR',
        resKey: 'survivor_steel',
        desc: 'When you fail a saving throw to avoid or end the Charmed or Frightened condition, take a Reaction to add your Proficiency Bonus to the roll, potentially causing it to succeed. Once used, you can\'t do so again until you finish a Long Rest. (Hypervigilance: when you roll Initiative, you can reroll the d20 if it is 9 or lower, using the new roll.)',
      },
    ]);
  }

  if (typeof registerFeatSheetResources === 'function') {
    registerFeatSheetResources('Survivor', [
      {
        key: 'survivor_steel',
        name: 'Steel Yourself',
        icon: 'shield',
        recharge: 'LR',
        max: 1,
      },
    ]);
  }
}
