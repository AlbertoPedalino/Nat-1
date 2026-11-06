import { createAdapterBindings } from '../adapterBindings.js';
import { finalAbilityModifier } from '../../shared/character/progression/abilityModifier.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
    getGenericSpeciesChoiceSpecs,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Dragonborn_XPHB", function (s) {
  let specs = getGenericSpeciesChoiceSpecs(s);
  // Draconic Resistance is determined by the ancestry choice; do not render a separate resistance choice.
  specs = specs.filter(function (x) { return !String(x.key || '').startsWith('species_resist'); });

  const fallbackAncestries = [
    'Black Dragon', 'Blue Dragon', 'Brass Dragon', 'Bronze Dragon', 'Copper Dragon',
    'Gold Dragon', 'Green Dragon', 'Red Dragon', 'Silver Dragon', 'White Dragon',
  ];
  const opts = [];

  if (Array.isArray(s._versions)) {
    s._versions.forEach(function (v) {
      if (v && v._abstract && Array.isArray(v._implementations)) {
        v._implementations.forEach(function (impl) {
          const vars = impl && impl._variables ? Object.values(impl._variables).filter(Boolean) : [];
          const label = vars[0] || impl?.name;
          if (label) opts.push({ key: impl?.name || label, label });
        });
      }
    });
  }

  fallbackAncestries.forEach(function (name) {
    if (!opts.some(function (opt) { return String(opt.label || opt.key).toLowerCase() === name.toLowerCase(); })) {
      opts.push({ key: name, label: name });
    }
  });

  specs.push({ key: 'species_version', label: 'Draconic Ancestry', type: 'option', options: opts, count: 1, level: 1 });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Dragonborn_XPHB", {
  labels: {
    species_version: 'Draconic Ancestry',
  },
});
registerSpeciesSheetActions("Dragonborn_XPHB", [
  {
    name: 'Breath Weapon',
    icon: '',
    cat: 'action',
    uses: 'PB / LR',
    resKey: 'dragonborn_breath',
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      const lv = Number(character?.level || 1);
      const dice = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 5 ? 2 : 1;
      return `${dice}d10`;
    } }],
    inlinePills: ({ character }) => {
      const pb = getProficiencyBonus(character);
      const conMod = finalAbilityModifier(character, 'con');
      return [{ icon: 'shield', label: 'Save DC', value: 8 + pb + conMod }];
    },
    minLevel: 1,
  },
  {
    name: 'Draconic Flight',
    icon: '',
    cat: 'bonus',
    uses: '1 / LR',
    resKey: 'dragonborn_flight',
    minLevel: 5,
  },
]);
registerSpeciesSheetResources("Dragonborn_XPHB", [
  {
    key: 'dragonborn_breath',
    name: 'Breath Weapon',
    icon: 'flame',
    recharge: 'LR',
    max: 'proficiencyBonus',
  },
  {
    key: 'dragonborn_flight',
    name: 'Draconic Flight',
    icon: 'wing',
    recharge: 'LR',
    minLevel: 5,
    max: 1,
  },
]);

registerSpeciesSheetEffects("Dragonborn_XPHB", [
  {
    type: 'resistance-choice',
    key: 'species_version',
    map: {
      black: 'Acid',
      copper: 'Acid',
      blue: 'Lightning',
      bronze: 'Lightning',
      brass: 'Fire',
      gold: 'Fire',
      red: 'Fire',
      green: 'Poison',
      silver: 'Cold',
      white: 'Cold',
    },
    minLevel: 1,
    note: 'Draconic Resistance',
  },
]);

}
