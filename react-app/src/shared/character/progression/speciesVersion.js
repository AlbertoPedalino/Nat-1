import { matchKey } from '../../content/nameKeys.js';
import { asArray } from '../../lists.js';

// A 5etools species with the version the character chose applied: lineages
// and legacies ("Elf; Drow Lineage", "Tiefling; Abyssal Legacy") and abstract
// variants (Dragonborn colours, `_abstract` + `_implementations`) carry their
// own darkvision, speed, resistances and spells, which replace the base
// species' ones. The choice is `species_version` (its stored key: "Drow",
// "Abyssal", "Black"). Without a matching version the species comes back as is.

const VERSION_FIELDS = ['darkvision', 'speed', 'resist', 'immune', 'conditionImmune', 'additionalSpells'];

function chosenVersion(species, choice) {
  const wanted = matchKey(choice);
  if (!wanted) return null;
  for (const version of asArray(species?._versions)) {
    if (version?._abstract && Array.isArray(version._implementations)) {
      const impl = version._implementations.find((candidate) => (
        Object.values(candidate?._variables || {}).some((value) => {
          const key = matchKey(value);
          return key && wanted.startsWith(key);
        })
      ));
      if (impl) return impl;
      continue;
    }
    const name = String(version?.name || '');
    const label = (name.includes(';') ? name.split(';').slice(1).join(';') : name).trim();
    const tail = matchKey(label);
    if (tail && tail.startsWith(wanted)) return { ...version, versionName: label };
  }
  return null;
}

export function speciesWithVersion(species, choices) {
  if (!species) return species;
  const raw = choices?.species_version;
  const version = chosenVersion(species, Array.isArray(raw) ? raw[0] : raw);
  if (!version) return species;
  const out = { ...species, versionName: version.versionName || null };
  VERSION_FIELDS.forEach((field) => {
    if (version[field] !== undefined) out[field] = version[field];
  });
  return out;
}
