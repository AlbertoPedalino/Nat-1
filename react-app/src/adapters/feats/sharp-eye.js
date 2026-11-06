import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);

  // Origin feat. Limited-use Advantage on Search/Study; a failed check does not
  // expend the use.
  registerFeatSheetActions('Sharp Eye', [
    {
      name: 'Sharp Eye',
      icon: 'eye',
      cat: 'special',
      uses: 'PB / LR',
      resKey: 'sharp_eye',
    },
  ]);

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
