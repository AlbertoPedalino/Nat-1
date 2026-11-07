import { normalizeSearchText } from '../../shared/content/searchText.js';
import { byName } from '../../shared/lists.js';

// The one filter every compendium catalog runs: its defaults merged with the
// chosen filters, every search word in the entry's name, the source, the
// catalog's own tests, then its sort with the name breaking ties (name order
// when the sort has no comparator).
//
// `tests(f)` returns the catalog's predicates `(record, entry) => boolean` for
// the merged filters `f`; `sorts` maps a sort key to a comparator of entries.
export function runCatalogFilter(entries, filters, defaults, { tests = () => [], sorts = {} } = {}) {
  const f = { ...defaults, ...filters };
  const terms = normalizeSearchText(f.search).split(' ').filter(Boolean);
  const predicates = tests(f);
  const list = (entries || []).filter((entry) => (
    terms.every((term) => entry.nameText.includes(term))
    && (f.source === 'all' || entry.source === f.source)
    && predicates.every((test) => test(entry.record, entry))
  ));
  const compare = sorts[f.sort];
  return list.sort(compare ? (a, b) => compare(a, b) || byName(a, b) : byName);
}
