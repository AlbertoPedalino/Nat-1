import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);

registerSpeciesSheetCommonChoiceMeta("Orc_XPHB");
registerSpeciesSheetActions("Orc_XPHB", [
  {
    name: 'Adrenaline Rush',
    cat: 'bonus',
    resKey: 'orc_adrenaline_rush',
    minLevel: 1,
  },
  {
    name: 'Relentless Endurance',
    cat: 'special',
    resKey: 'orc_relentless_endurance',
    minLevel: 1,
  },
]);
registerSpeciesSheetResources("Orc_XPHB", [
  {
    key: 'orc_adrenaline_rush',
    name: 'Adrenaline Rush',
    recharge: 'SR+LR',
    max: 'proficiencyBonus',
  },
  {
    key: 'orc_relentless_endurance',
    name: 'Relentless Endurance',
    recharge: 'LR',
    max: 1,
  },
]);

}

