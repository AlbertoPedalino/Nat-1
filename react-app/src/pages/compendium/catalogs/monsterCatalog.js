// The monster catalog: the compendium's creatures with the filters of a
// bestiary, read the way the encounter builder's bestiary reads them. Pure;
// its columns are in catalogColumns.jsx.

import { armorClassEntry, getHP, getAC, getSizeLabel } from '../../../shared/bestiary/monsterUtils.js';
import { CR_OPTIONS, CREATURE_TYPE_OPTIONS } from '../../../shared/bestiary/bestiaryConstants.js';
import { monsterCrValue, monsterSizes, monsterTypeKey } from '../../../shared/bestiary/filters.js';
import { SIZE_NAMES } from '../../../shared/content/rulesVocabulary.js';
import { crKey, crNumber } from '../../../shared/bestiary/challengeRating.js';

export const MONSTER_SIZES = Object.freeze(Object.entries(SIZE_NAMES).map(([key, label]) => ({ key, label })));

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
  fields: [
    {
      kind: 'select', key: 'crFrom', label: 'CR from', options: CR_OPTIONS,
      match: (monster, cr) => monsterCrValue(monster) >= crNumber(cr),
    },
    {
      kind: 'select', key: 'crTo', label: 'CR to', options: CR_OPTIONS,
      match: (monster, cr) => monsterCrValue(monster) <= crNumber(cr),
    },
    { kind: 'select', key: 'type', label: 'Type', options: CREATURE_TYPE_OPTIONS, valueOf: monsterTypeKey },
    { kind: 'select', key: 'size', label: 'Size', options: MONSTER_SIZES, valueOf: monsterSizes },
  ],
  sorts: [
    { key: 'name', label: 'Name' },
    { key: 'cr', label: 'Challenge Rating', compare: (a, b) => monsterCrValue(a.record) - monsterCrValue(b.record) },
  ],
});
