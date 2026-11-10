import { createAdapterBindings } from '../adapterBindings.js';
import { resolveScalingFormula } from '../../shared/character/dice/scalingFormula.js';
import { withModifier } from '../../shared/ui/numberFormat.js';

// The bite deals 1d4 + CON Piercing instead of the Unarmed Strike's damage.
function biteDamageFormula(character) {
  const con = resolveScalingFormula('abilityMod:con', character) ?? 0;
  return withModifier('1d4', con);
}

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
      rollers: [{ kind: 'damage', formula: ({ character }) => biteDamageFormula(character), label: ({ formula }) => `${formula} piercing` }],
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

}
