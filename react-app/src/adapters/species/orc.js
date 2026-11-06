import { createAdapterBindings } from '../adapterBindings.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetCommonChoiceMeta,
    getGenericSpeciesChoiceSpecs,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Orc_XPHB", function (s) {
  return getGenericSpeciesChoiceSpecs(s);
});

registerSpeciesSheetCommonChoiceMeta("Orc_XPHB");
registerSpeciesSheetActions("Orc_XPHB", [
  {
    name: 'Adrenaline Rush',
    icon: '',
    cat: 'bonus',
    uses: 'PB / SR or LR',
    resKey: 'orc_adrenaline_rush',
    minLevel: 1,
    inlinePills: ({ character }) => [{ icon: 'heart', label: 'Temp HP', value: getProficiencyBonus(character) }],
  },
  {
    name: 'Relentless Endurance',
    icon: '',
    cat: 'special',
    uses: '1 / LR',
    resKey: 'orc_relentless_endurance',
    minLevel: 1,
  },
]);
registerSpeciesSheetResources("Orc_XPHB", [
  {
    key: 'orc_adrenaline_rush',
    name: 'Adrenaline Rush',
    icon: 'zap',
    recharge: 'SR+LR',
    max: 'proficiencyBonus',
  },
  {
    key: 'orc_relentless_endurance',
    name: 'Relentless Endurance',
    icon: 'heart',
    recharge: 'LR',
    max: 1,
  },
]);

}

