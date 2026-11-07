import { matchKey } from '../../content/nameKeys.js';
import { matchesQuery } from '../../content/searchText.js';
import { spellMatchesAnyClass } from './spellClassMatch.js';
import { dedupeSpells } from './spellSnapshots.js';

// The spells a picker offers at one spell level, the same in the builder and
// on the sheet:
//   - a Wizard preparing picks from its spellbook (`spellbookNames`);
//   - otherwise every spell of the level on one of `classNames`' lists, a
//     leveled spell only up to `maxLevel` (`classNames: null` = any list);
//   - spells the class grants anyway (`granted`, records with a `level`) come
//     first;
//   - one entry per name, matching `query`, at most `limit`.
// `findSpell(name)` resolves a spellbook name to its record (by default from
// `spells`); an unknown one is listed by name.
export function spellPickerPool({
  spells = [], level, classNames = [], classSpellIndex = {}, maxLevel = Infinity,
  spellbookNames = null, granted = [], query = '', limit = 200, findSpell = null,
}) {
  const lookup = findSpell || (() => {
    const byName = new Map(spells.filter((spell) => spell?.name).map((spell) => [matchKey(spell.name), spell]));
    return (name) => byName.get(matchKey(name));
  })();
  const base = spellbookNames
    ? spellbookNames.map((name) => lookup(name) || { name, level })
    : spells
      .filter((spell) => Number(spell.level || 0) === level)
      .filter((spell) => level === 0 || level <= maxLevel)
      .filter((spell) => classNames == null || spellMatchesAnyClass(spell, classNames, classSpellIndex));
  return dedupeSpells([
    ...granted.filter((spell) => Number(spell.level || 0) === level),
    ...base,
  ])
    .filter((spell) => matchesQuery(query, spell.name, spell.schoolFull || spell.school))
    .slice(0, limit);
}
