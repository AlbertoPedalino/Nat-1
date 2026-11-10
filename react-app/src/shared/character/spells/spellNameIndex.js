import { matchKey } from '../../content/nameKeys.js';

// The spells by name (matchKey) and by "name|source": the catalog's chosen
// printing first, other printings by name|source, then the character's saved
// snapshots for spells the catalog lacks. The one index the builder and the
// sheet look spells up in.
export function spellNameIndex({ spells = [], versions = [], snapshots = [] } = {}) {
  const map = new Map();
  spells.forEach((spell) => { if (spell?.name) map.set(matchKey(spell.name), spell); });
  versions.forEach((spell) => {
    if (spell?.name && spell.source) map.set(spellSourceKey(spell.name, spell.source), spell);
  });
  snapshots.forEach((spell) => {
    if (!spell?.name) return;
    if (!map.has(matchKey(spell.name))) map.set(matchKey(spell.name), spell);
    const key = spellSourceKey(spell.name, spell.source);
    if (spell.source && !map.has(key)) map.set(key, spell);
  });
  return map;
}

// A spell's "name|source" key in that index.
export function spellSourceKey(name, source) {
  return `${matchKey(name)}|${matchKey(source)}`;
}
