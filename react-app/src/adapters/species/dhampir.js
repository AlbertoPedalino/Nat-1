import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    getGenericSpeciesChoiceSpecs,
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
  } = createAdapterBindings(registry, context);

  // Size (Medium/Small), Necrotic Resistance and the Climb Speed are read straight
  // from the species JSON; only the limited-use Vampiric Bite needs wiring here.
  registerSpeciesAdapter('Dhampir_RHW', function (s) {
    return getGenericSpeciesChoiceSpecs(s);
  });

  registerSpeciesSheetActions('Dhampir_RHW', [
    {
      name: 'Vampiric Bite',
      icon: 'fang',
      cat: 'special',
      uses: 'PB / LR',
      resKey: 'dhampir_bite',
      minLevel: 1,
      rollers: [{ kind: 'damage', formula: '1d4', label: ({ formula }) => `${formula} + CON piercing` }],
      rollLabelPrefix: 'Vampiric Bite',
    },
  ]);

  registerSpeciesSheetResources('Dhampir_RHW', [
    {
      key: 'dhampir_bite',
      name: 'Vampiric Bite (Empower)',
      icon: 'fang',
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);

  registerSpeciesSheetEffects('Dhampir_RHW', [
    {
      type: 'reminder',
      minLevel: 1,
      note: 'Spider Climb: you have a Climb Speed equal to your Speed. From character level 3, you can move up, down, and across vertical surfaces and along ceilings while leaving your hands free.',
    },
  ]);
}
