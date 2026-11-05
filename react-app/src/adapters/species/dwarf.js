import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
    registerSpeciesSheetHpBonus,
    getGenericSpeciesChoiceSpecs,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Dwarf_XPHB", function (s) {
  return getGenericSpeciesChoiceSpecs(s);
});

registerSpeciesSheetCommonChoiceMeta("Dwarf_XPHB");

// Dwarven Toughness: +1 HP per character level
registerSpeciesSheetHpBonus("Dwarf_XPHB", 1);
registerSpeciesSheetHpBonus("Dwarf_PHB", 1);
registerSpeciesSheetHpBonus("Hill Dwarf_XPHB", 1);
registerSpeciesSheetHpBonus("Hill Dwarf_PHB", 1);

registerSpeciesSheetActions("Dwarf_XPHB", [
  {
    name: 'Stonecunning',
    icon: '',
    cat: 'bonus',
    uses: 'PB / LR',
    resKey: 'dwarf_stonecunning',
    minLevel: 1,
    inlinePills: [
      { icon: 'radar', label: 'Sense', value: 'Tremorsense 60 ft' },
      { icon: 'timer', label: 'Duration', value: '10 min' },
    ],
  },
]);
registerSpeciesSheetResources("Dwarf_XPHB", [
  {
    key: 'dwarf_stonecunning',
    name: 'Stonecunning',
    icon: 'radar',
    recharge: 'LR',
    max: 'proficiencyBonus',
  },
]);

// Dwarven Resilience: Advantage on saves to avoid or end the Poisoned condition.
registerSpeciesSheetEffects("Dwarf_XPHB", [
  { type: 'advantage', target: 'save', conditions: ['Poisoned'], minLevel: 1, note: 'Dwarven Resilience' },
]);

}
