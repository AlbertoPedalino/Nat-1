import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    getGenericSpeciesChoiceSpecs,
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
  } = createAdapterBindings(registry, context);

  // Knowledge from a Past Life (skill choice) and Strange Endurance (resistance
  // choice from Cold/Necrotic/Poison) are parsed from the species JSON; only the
  // limited-use d6 reroll aid needs wiring.
  registerSpeciesAdapter('Reborn_RHW', function (s) {
    return getGenericSpeciesChoiceSpecs(s);
  });

  registerSpeciesSheetActions('Reborn_RHW', [
    {
      name: 'Knowledge from a Past Life',
      icon: 'brain',
      cat: 'special',
      uses: 'PB / LR',
      resKey: 'reborn_knowledge',
      minLevel: 1,
      desc: 'When you fail an ability check, you can roll {@dice 1d6} and add the number rolled to the d20, potentially turning the failure into a success. Uses equal to your Proficiency Bonus, regained on a Long Rest.',
    },
  ]);

  registerSpeciesSheetResources('Reborn_RHW', [
    {
      key: 'reborn_knowledge',
      name: 'Knowledge from a Past Life',
      icon: 'brain',
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);

  registerSpeciesSheetEffects('Reborn_RHW', [
    {
      type: 'reminder',
      minLevel: 1,
      note: 'Escaped Death: you have Advantage on Death Saving Throws.',
    },
    {
      type: 'reminder',
      minLevel: 1,
      note: "Everlasting: you don't gain Exhaustion from dehydration, malnutrition, or suffocation; you don't need to sleep and magic can't put you to sleep; you can finish a Long Rest in 4 hours of inactive rest while remaining conscious.",
    },
  ]);
}
