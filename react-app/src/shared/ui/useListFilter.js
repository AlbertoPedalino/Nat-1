import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOptionSearch } from '../content/searchText.js';
import {
  countChosenValues, fieldDefaults, matchesFields, offeredFilters,
} from '../content/filterFields.js';

// The search and the filters of a page's list (a library of saves, the
// campaigns, the battle map's tables and scenes), drawn by ListFilterBar.
// `getText` is a row's searchable text (a string or a list of them), searched
// as every selection panel's (useOptionSearch); `fields` its filters, as
// filterFields describes them (a campaign: campaignFilterField). A choice no
// longer offered (a campaign left, the user signed out) stops filtering
// (offeredFilters), so a list is never narrowed by a control that is not
// there. A new `resetKey` (another save looked at) starts the search and the
// filters over. `visible` is what is left to show; `filtered` whether
// anything is narrowing it.
export function useListFilter(rows, { getText, fields = NO_FIELDS, resetKey } = {}) {
  const { query, setQuery, visibleOptions: matching } = useOptionSearch(rows, { getText, minOptions: 0 });
  const [chosen, setChosen] = useState({});
  useEffect(() => {
    setQuery('');
    setChosen({});
  }, [resetKey, setQuery]);
  const filters = useMemo(
    () => offeredFilters(fields, { ...fieldDefaults(fields), ...chosen }, rows),
    [chosen, fields, rows],
  );

  const visible = useMemo(
    () => (fields.length ? matching.filter((row) => matchesFields(fields, filters, row)) : matching),
    [matching, fields, filters],
  );
  const setFilter = useCallback((key, value) => setChosen((prev) => ({ ...prev, [key]: value })), []);

  return {
    query,
    setQuery,
    fields,
    filters,
    setFilter,
    rows,
    visible,
    total: rows.length,
    filtered: Boolean(query) || countChosenValues(fields, filters) > 0,
  };
}

const NO_FIELDS = Object.freeze([]);
