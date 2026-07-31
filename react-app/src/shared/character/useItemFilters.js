import { useMemo, useState } from 'react';
import { buildItemFilterOptions, emptyItemFilters, itemFiltersKey } from './itemFilters.js';

// One advanced-filter set, wired. Four lists across the builder and the sheet
// each need the same four things — state, options derived from their pool, a
// stable key for paging resets, and the props the panel wants — so they ask for
// them once instead of assembling them four times and drifting apart.
//
// Every call is a separate set: filtering the item database must never move
// rows in the carried list on the same screen.
//
// `controlled` takes a [value, setValue] pair for callers that keep the filters
// somewhere longer-lived than the component — the builder holds them in its
// reducer so they survive leaving the Equipment step and coming back. Omit it
// and the hook owns the state.

export function useItemFilters(pool, controlled) {
  const own = useState(emptyItemFilters);
  const [filters, setFilters] = controlled || own;
  const options = useMemo(() => buildItemFilterOptions(pool), [pool]);

  return {
    filters,
    // Filter state is a fresh object on every edit; key off this to react to a
    // changed *query* rather than to a new reference.
    key: itemFiltersKey(filters),
    panelProps: { filters, onChange: setFilters, options },
  };
}
