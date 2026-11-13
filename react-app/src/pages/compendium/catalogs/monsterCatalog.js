// The monster catalog: the compendium's creatures with the bestiary's own
// filters (MONSTER_FILTER_FIELDS, the encounter builder's too). Pure;
// its columns are in catalogColumns.jsx.

import { armorClassEntry, getHP, getAC, getSizeLabel } from '../../../shared/bestiary/monsterUtils.js';
import { MONSTER_FILTER_FIELDS, monsterCrValue } from '../../../shared/bestiary/filters.js';
import { crKey } from '../../../shared/bestiary/challengeRating.js';

// A stat block without a CR, or whose AC / Hit Points are a rule (Bear Form:
// "15 + your Wisdom modifier"), shows a dash there.
export function monsterStats(monster) {
  return {
    cr: monster?.cr == null ? '—' : crKey(monster.cr),
    size: getSizeLabel(monster),
    ac: armorClassEntry(monster?.ac).value == null ? '—' : getAC(monster?.ac),
    hp: monster?.hp?.special ? '—' : getHP(monster?.hp),
  };
}

export const MONSTER_CATALOG = Object.freeze({
  key: 'monsters',
  label: 'monsters',
  select: (entry) => entry.kind === 'monster',
  fields: MONSTER_FILTER_FIELDS,
  sorts: [
    { key: 'name', label: 'Name' },
    { key: 'cr', label: 'Challenge Rating', compare: (a, b) => monsterCrValue(a.record) - monsterCrValue(b.record) },
  ],
});
