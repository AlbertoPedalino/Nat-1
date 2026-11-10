import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);

registerSpeciesSheetCommonChoiceMeta("Dwarf_XPHB");


registerSpeciesSheetActions("Dwarf_XPHB", [
  {
    name: 'Stonecunning',
    cat: 'bonus',
    resKey: 'dwarf_stonecunning',
    minLevel: 1,
  },
]);
registerSpeciesSheetResources("Dwarf_XPHB", [
  {
    key: 'dwarf_stonecunning',
    name: 'Stonecunning',
    recharge: 'LR',
    max: 'proficiencyBonus',
  },
]);

// Dwarven Resilience: Advantage on saves to avoid or end the Poisoned condition.
// Dwarven Toughness: +1 HP per character level.
registerSpeciesSheetEffects("Dwarf_XPHB", [
  { type: 'advantage', target: 'save', conditions: ['Poisoned'], minLevel: 1, note: 'Dwarven Resilience' },
  { type: 'hpBonus', perLevel: 1, minLevel: 1, note: 'Dwarven Toughness' },
]);

}
