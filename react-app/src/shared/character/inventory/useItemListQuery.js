import { useMemo } from 'react';
import { matchesItemGroupChip, matchesItemStates } from './itemGroups.js';
import { itemMatchesSearch } from './itemSearch.js';
import { itemMatchesFilters } from './itemFilters.js';
import { useItemFilters } from './useItemFilters.js';

const identity = (entry) => entry;
const NO_STATES = Object.freeze([]);

// One list of items narrowed the same way on every screen (the sheet's add
// panel and inventory, the builder's two lists): by the group chip and the
// search box into the pool the advanced filter panel builds its dropdowns
// from — not by the panel's own choices, or chip "Armor" would keep offering
// "Martial Melee Weapon", which can only return nothing — then by the panel.
//
// `entries` are items, or rows holding one (`getItem` reads it: an owned
// item keeps its inventory index beside it). `filtersState` is the panel's
// state when a reducer keeps it ([filters, setFilters]); `compare` orders the
// results. `resetKey` changes with the *query*, not the array, so a list
// pages back to the top on a new search but not on every quantity tick.
// `states` are the owned-item states that must all hold (ITEM_STATE_CHIPS).
export function useItemListQuery(entries, {
  chip = 'all', states = NO_STATES, query = '', getItem = identity, filtersState, compare = null,
} = {}) {
  const q = String(query || '').trim();
  const pool = useMemo(() => (entries || []).filter((entry) => {
    const item = getItem(entry);
    return matchesItemGroupChip(item, chip) && matchesItemStates(item, states) && itemMatchesSearch(item, q);
  }), [entries, chip, states, q, getItem]);
  const poolItems = useMemo(() => (getItem === identity ? pool : pool.map(getItem)), [pool, getItem]);
  const filterList = useItemFilters(poolItems, filtersState);
  const results = useMemo(() => {
    const kept = pool.filter((entry) => itemMatchesFilters(getItem(entry), filterList.filters));
    return compare ? kept.sort(compare) : kept;
  }, [pool, filterList.filters, compare, getItem]);
  return {
    results,
    filterList,
    resetKey: `${q}|${chip}|${states.join(',')}|${filterList.key}`,
  };
}
