import { createAdapterBindings } from '../adapterBindings.js';
import { finalAbilityModifier } from '../../shared/character/progression/abilityScores.js';
import { withModifier } from '../../shared/ui/numberFormat.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
// Goliath XPHB: Giant Ancestry, the giant whose benefit the character has
// (PB uses per Long Rest, shared); each action is gated on the choice.
registerSpeciesAdapter("Goliath_XPHB", function (s) {
  let specs = [];
  const ancestryOpts = [
    { key: "Cloud's Jaunt",    label: "Cloud Giant — Teleport (Intelligence)" },
    { key: "Fire's Burn",      label: "Fire Giant — Bonus Fire Damage (Strength)" },
    { key: "Frost's Chill",    label: "Frost Giant — Cold Damage + Slow (Constitution)" },
    { key: "Hill's Tumble",    label: "Hill Giant — Knock Prone (Strength)" },
    { key: "Stone's Endurance",label: "Stone Giant — Damage Reduction (Constitution)" },
    { key: "Storm's Thunder",  label: "Storm Giant — Bonus Thunder Damage (Strength)" },
  ];
  specs.push({ key: 'species_version', label: 'Giant Ancestry', type: 'option', options: ancestryOpts, count: 1, level: 1 });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Goliath_XPHB", {
  labels: {
    species_version: 'Giant Ancestry',
  },
});
registerSpeciesSheetActions("Goliath_XPHB", [
  {
    name: "Cloud's Jaunt",
    
    cat: 'bonus',
    
    resKey: 'goliath_giant_ancestry',
    minLevel: 1,
    requiredChoice: { key: 'species_version', value: "Cloud's Jaunt" },
  },
  {
    name: "Fire's Burn",
    
    cat: 'special',
    
    resKey: 'goliath_giant_ancestry',
    rollers: [{ kind: 'damage', formula: '1d10' }],
    minLevel: 1,
    requiredChoice: { key: 'species_version', value: "Fire's Burn" },
  },
  {
    name: "Frost's Chill",
    
    cat: 'special',
    
    resKey: 'goliath_giant_ancestry',
    rollers: [{ kind: 'damage', formula: '1d6' }],
    minLevel: 1,
    requiredChoice: { key: 'species_version', value: "Frost's Chill" },
  },
  {
    name: "Hill's Tumble",
    
    cat: 'special',
    
    resKey: 'goliath_giant_ancestry',
    minLevel: 1,
    requiredChoice: { key: 'species_version', value: "Hill's Tumble" },
  },
  {
    name: "Stone's Endurance",
    
    cat: 'reaction',
    
    resKey: 'goliath_giant_ancestry',
    minLevel: 1,
    requiredChoice: { key: 'species_version', value: "Stone's Endurance" },
    inlinePills: ({ character }) => {
      const conMod = finalAbilityModifier(character, 'con');
      return [{ label: 'Reduction', value: withModifier('1d12', conMod) }];
    },
  },
  {
    name: "Storm's Thunder",
    
    cat: 'reaction',
    
    resKey: 'goliath_giant_ancestry',
    rollers: [{ kind: 'damage', formula: '1d8' }],
    minLevel: 1,
    requiredChoice: { key: 'species_version', value: "Storm's Thunder" },
  },
  {
    name: 'Large Form',
    
    cat: 'bonus',
    
    resKey: 'goliath_large_form',
    minLevel: 5,
    inlinePills: [
      { label: 'Duration', value: '10 min' },
      { label: 'Speed', value: '+10 ft' },
    ],
  },
]);
registerSpeciesSheetResources("Goliath_XPHB", [
  {
    key: 'goliath_giant_ancestry',
    name: 'Giant Ancestry',
    
    recharge: 'LR',
    max: 'proficiencyBonus',
  },
  {
    key: 'goliath_large_form',
    name: 'Large Form',
    
    recharge: 'LR',
    minLevel: 5,
    max: 1,
  },
]);

}

