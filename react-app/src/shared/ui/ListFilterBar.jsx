import { Box } from '@mui/material';
import SearchField from './SearchField.jsx';
import FilterFieldControls from './FilterFieldControls.jsx';
import EmptyLine from './EmptyLine.jsx';
import { asArray } from '../lists.js';

// The bar over a page's list: a search ("Search <what>…") and the list's
// filters (the app's FilterFieldControls; a filter with nothing to offer is
// left out). `filter` is useListFilter's state. It says so when nothing is
// left to show, so a list never goes blank under a search without a word.
// Every main page's list takes this one bar; `sx` is for placement only.
export default function ListFilterBar({ filter, what, sx }) {
  return (
    <Box sx={[wrapSx, ...asArray(sx)]}>
      <Box sx={barSx}>
        <SearchField
          value={filter.query}
          onChange={filter.setQuery}
          placeholder={`Search ${what}…`}
          ariaLabel={`Search ${what}`}
          sx={searchSx}
        />
        {filter.fields.length ? (
          <FilterFieldControls fields={filter.fields} filters={filter.filters} onChange={filter.setFilter} entries={filter.rows} />
        ) : null}
      </Box>
      {filter.filtered && filter.total > 0 && !filter.visible.length ? (
        <EmptyLine>No {what} match.</EmptyLine>
      ) : null}
    </Box>
  );
}

const wrapSx = { display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 };

const barSx = { display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' };

const searchSx = { flex: '1 1 220px', minWidth: 0 };
