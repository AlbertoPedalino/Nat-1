import { adapterRegistry } from '../../../adapters/registry.js';
import { asArray } from '../../lists.js';

// What the adapter registry needs to know before it reads a record that stands
// on another one (registry.js, "Inherited entries"): which classes are skins of
// which base class, and which species reprint which. It comes from the data —
// the loaded class and species records in the builder, the class and species
// snapshots saved with a character on the sheet.

export function registerClassSkins(classes) {
  asArray(classes).forEach((cls) => {
    if (!cls?.name || !cls?.ruleClass?.name) return;
    adapterRegistry.registerClassSkin(cls.name, { base: cls.ruleClass.name, removedFeatures: cls.removedFeatures });
  });
}

export function registerSpeciesCopies(speciesList) {
  asArray(speciesList).forEach((species) => {
    if (species?.name && species?.copiedFrom?.name) {
      adapterRegistry.registerSpeciesCopy(species.name, species.source, species.copiedFrom);
    }
  });
}

// A saved or in-progress character's classes and species.
export function registerCharacterInheritance(C) {
  if (!C) return;
  registerClassSkins([
    { name: C.className, ...(C.cls || C.clsSnapshot || {}) },
    ...asArray(C.extraClasses).map((extra) => ({ name: extra?.name, ...(extra?.cls || extra?.clsSnapshot || {}) })),
  ]);
  registerSpeciesCopies([{
    name: C.speciesName,
    source: C.speciesSource,
    copiedFrom: C.speciesObj?.copiedFrom || C.speciesSnapshot?.copiedFrom || null,
  }]);
}
