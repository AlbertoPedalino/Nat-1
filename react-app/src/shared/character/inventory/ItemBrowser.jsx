import { useDeferredValue, useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import SearchField from '../../ui/SearchField.jsx';
import Caption from '../../ui/Caption.jsx';
import EmptyLine from '../../ui/EmptyLine.jsx';
import { entryCardWellSx } from '../../ui/entryCard.js';
import { usePagedList } from '../../ui/usePagedList.js';
import { sheetSectionHeaderSx } from '../../ui/PanelHeader.jsx';
import { SURFACES } from '../../ui/surfaces.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { formatNumber } from '../../ui/numberFormat.js';
import ItemGroupFilter from './ItemGroupFilter.jsx';
import ItemFilterPanel from './ItemFilterPanel.jsx';
import { useItemListQuery } from './useItemListQuery.js';
import { compareItemsBySearch } from './itemSearch.js';

// Every list of items on the sheet and in the builder (the item database to
// add from, the items owned): one search, the shelves (and, for owned items,
// their states), the advanced filters, how many are shown, and the rows in a
// scrolling well that loads a page at a time. The four lists differ only in
// what they list and how a row looks.
//
// - `entries`: items, or rows holding one (`getItem` reads it).
// - `search`: [text, setText], so a caller can keep it longer (the builder's
//   reducer); the list follows the text a beat behind the typing.
// - `chips` and `states`: [value, setValue] of the shelves (ItemGroupFilter)
//   and of the owned-item states (none: no states row).
// - `filtersState`: the advanced filters' [value, setValue] when kept
//   elsewhere (useItemFilters owns them otherwise).
// - `order`: 'search' (closest to the search first) or a comparator.
// - `total`: the count the shown ones are out of.
// - `renderRows(visible)`: the rows of the page loaded so far; keep it stable
//   (useCallback), the rows are rebuilt only when it or the page changes.
// - `empty` / `noMatch`: what the well says with no entries at all, or none
//   that match.
export default function ItemBrowser({
  entries, getItem, search, placeholder = 'Search items by name, source, type, property…',
  chips, states = null, filtersState, order = null, pageSize = 50, total, renderRows,
  empty = null, noMatch = 'No items match this search or filter.',
}) {
  const [text, setText] = search;
  const query = useDeferredValue(text).trim();
  const compare = useMemo(
    () => (order === 'search' ? compareItemsBySearch(query.toLowerCase()) : order),
    [order, query],
  );
  const [chip, setChip] = chips;
  const { results, filterList, resetKey } = useItemListQuery(entries, {
    chip, states: states?.[0], query, getItem, filtersState, compare,
  });
  const page = usePagedList(results, { pageSize, resetKey });
  const rows = useMemo(() => renderRows(page.visible), [renderRows, page.visible]);
  const settling = query !== text.trim();

  let fallback = null;
  if (!entries?.length) fallback = empty;
  else if (!results.length) fallback = <EmptyLine inList>{noMatch}</EmptyLine>;

  return (
    <Stack spacing={0.75}>
      <SearchField placeholder={placeholder} value={text} onChange={setText} density="compact" />
      <ItemGroupFilter
        value={chip}
        onChange={setChip}
        states={states?.[0] ?? null}
        onStatesChange={states?.[1]}
        sx={{ mb: 0 }}
      />
      <ItemFilterPanel {...filterList.panelProps} />
      <Caption>
        {settling ? 'Updating results…' : `${formatNumber(results.length)} of ${formatNumber(total ?? entries?.length ?? 0)} items`}
      </Caption>
      <Box {...page.listProps} sx={ITEM_LIST_WELL_SX}>
        {rows}
        {fallback}
      </Box>
    </Stack>
  );
}

// The well every item list scrolls in: as tall as half the screen, never
// more than a column of cards.
const ITEM_LIST_WELL_SX = entryCardWellSx({ xs: 360, md: 'min(50vh, 520px)' });

// A part of the inventory (adding items, the items owned) on the sheet and in
// the builder: the same inset frame, headed by its title (`icon`, `title`) or
// by a control of its own (`head`: the Add Item toggle, which spaces what it
// opens itself).
export function ItemListSection({ icon: Icon, title, head = null, children, sx }) {
  return (
    <Box sx={[sectionSx, sx]}>
      {head ?? (
        <Typography component="h3" sx={titleSx}>
          {Icon ? <Icon size={ICON_SIZES.xs} /> : null}
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
}

const sectionSx = { ...SURFACES.inset, p: 1 };

const titleSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  minWidth: 0,
  mb: 0.75,
  ...sheetSectionHeaderSx({ rule: null }),
};
