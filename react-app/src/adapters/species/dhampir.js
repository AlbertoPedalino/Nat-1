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
      desc: "When you hit with an Unarmed Strike, you can bite instead, dealing Piercing damage equal to {@damage 1d4} plus your Constitution modifier. When you deal this damage to a creature that isn't a Construct or Undead, you can empower yourself once per use — Drain (regain HP equal to the Piercing damage) or Strengthen (bonus to your next ability check or attack roll within 1 minute equal to the Piercing damage). You can empower yourself a number of times equal to your Proficiency Bonus, regaining all uses on a Long Rest.",
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
