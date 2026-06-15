import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatSheetActions,
    registerFeatSheetResources,
  } = createAdapterBindings(registry, context);

  // Origin feat. Limited-use Advantage on Search/Study; a failed check does not
  // expend the use.
  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Sharp Eye', [
      {
        name: 'Sharp Eye',
        icon: 'eye',
        cat: 'special',
        uses: 'PB / LR',
        resKey: 'sharp_eye',
        desc: 'When you take the Search or Study action, you can give yourself Advantage on any ability check made as part of that action. Uses equal to your Proficiency Bonus, regained on a Long Rest. If the check fails, the use is not expended.',
      },
    ]);
  }

  if (typeof registerFeatSheetResources === 'function') {
    registerFeatSheetResources('Sharp Eye', [
      {
        key: 'sharp_eye',
        name: 'Sharp Eye',
        icon: 'eye',
        recharge: 'LR',
        max: 'proficiencyBonus',
      },
    ]);
  }
}
