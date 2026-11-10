import { createAdapterBindings } from '../adapterBindings.js';
import { saveDcPills } from '../../shared/character/progression/featureSaveDc.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Dragonborn_XPHB", function (s) {
  // Draconic Resistance follows the ancestry: no separate resistance pick.
  const specs = [];

  // The ten ancestries from the species data, each with the damage type it
  // gives (the stored value stays the colour).
  const opts = [];
  if (Array.isArray(s._versions)) {
    s._versions.forEach(function (v) {
      if (v && v._abstract && Array.isArray(v._implementations)) {
        v._implementations.forEach(function (impl) {
          const color = impl?._variables?.color || impl?.name;
          if (!color) return;
          const damage = impl?._variables?.damageType;
          opts.push({ key: color, label: damage ? color + ' (' + damage + ')' : color });
        });
      }
    });
  }

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
    cat: 'action',
    resKey: 'dragonborn_breath',
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      const lv = Number(character?.level || 1);
      const dice = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 5 ? 2 : 1;
      return `${dice}d10`;
    } }],
    inlinePills: saveDcPills('con'),
    minLevel: 1,
  },
  {
    name: 'Draconic Flight',
    cat: 'bonus',
    resKey: 'dragonborn_flight',
    minLevel: 5,
  },
]);
registerSpeciesSheetResources("Dragonborn_XPHB", [
  {
    key: 'dragonborn_breath',
    name: 'Breath Weapon',
    recharge: 'LR',
    max: 'proficiencyBonus',
  },
  {
    key: 'dragonborn_flight',
    name: 'Draconic Flight',
    recharge: 'LR',
    minLevel: 5,
    max: 1,
  },
]);

// Draconic Resistance comes with the chosen colour's data (speciesVersion.js).

}
