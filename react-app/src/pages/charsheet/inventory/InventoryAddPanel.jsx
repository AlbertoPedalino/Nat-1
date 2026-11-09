import { memo, useDeferredValue, useMemo, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { ItemNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import {
  ItemReferenceBody,
  QuantityAdder,
} from '../../../shared/character/inventory/ItemReference.jsx';
import ItemFilterPanel from '../../../shared/character/inventory/ItemFilterPanel.jsx';
import {
  hasActiveItemFilters,
  itemMatchesFilters,
} from '../../../shared/character/inventory/itemFilters.js';
import { useItemFilters } from '../../../shared/character/inventory/useItemFilters.js';
import { usePagedList } from '../../../shared/ui/usePagedList.js';
import { compareItemsBySearch, itemMatchesPreparedSearch } from './itemSearch.js';
import {
  InventoryFilterButtons,
  compactInputSx,
  inventorySectionSx,
} from './inventoryControls.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import ShowMoreButton from '../../../shared/ui/ShowMoreButton.jsx';
import { goldToggleSx } from '../../../shared/ui/actionButton.js';
import { emptyTextSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The result list renders in pages instead of hard-capping: a broad filter can
// legitimately match most of the item DB (~2500 entries once magic variants are
// expanded, so most searches overflow any fixed cap), and truncating
// made it look like the filter had only searched the first alphabetical slice.
// 120 rows a page: the old hard cap rendered that many at once, so the DOM cost
// is known to be fine, and it takes fewer scrolls to cross a ~2500-item DB.
const SEARCH_PAGE = 120;

function parseDecimalInput(value) {
  const parsed = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

// Add-list row: tap to expand the item reference (props + live rich text),
// pick a quantity, then Add. The quantity adder stops propagation so it never
// toggles the expand.
function AddResultRow({ item, onAdd }) {
  return (
    <ExpandableCard
      containerSx={{ ...SURFACES.panel, flexShrink: 0, overflow: 'hidden', '&:hover': { borderColor: UI_COLORS.accent } }}
      detailsSx={{ px: 1.25, pt: 0.25, pb: 1, bgcolor: UI_COLORS.surfaceSunken, fontSize: FONT_SIZES.md, color: 'text.secondary' }}
      details={<ItemReferenceBody item={item} />}
      summary={({ toggle }) => (
        <Box onClick={toggle} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.75, cursor: 'pointer' }}>
          <ItemNameIcon item={item} />
          <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: FONT_SIZES.xxl, color: 'text.primary' }}>{item.name}</Typography>
          <QuantityAdder onAdd={(qty) => onAdd(item, qty)} addColor="success" />
        </Box>
      )}
    />
  );
}

const SearchResultsList = memo(function SearchResultsList({ items, itemsDbCount, onAddItem, resetKey }) {
  const page = usePagedList(items, { pageSize: SEARCH_PAGE, resetKey });
  const { visible, listProps } = page;

  return (
    <Box {...listProps} sx={{ ...SURFACES.inset, maxHeight: 320, overflowY: 'auto', mb: 0.75, p: 0.25, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {visible.map((item) => (
        <AddResultRow key={`${item.name}-${item.source}`} item={item} onAdd={onAddItem} />
      ))}
      <ShowMoreButton page={page} />
      {!items.length && (
        <Typography sx={{ ...emptyTextSx, py: 0.75, px: 1 }}>
          {itemsDbCount ? 'No items found.' : 'Loading items.'}
        </Typography>
      )}
    </Box>
  );
});

// The "Add Item" section: a search over the 2024 item database and a custom
// item form. Its search and filters are its own, so narrowing them never hides
// rows of the inventory list below. It stays mounted while collapsed, keeping
// what was typed.
export default function InventoryAddPanel({ itemsDb, onAddItem }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filter, setFilter] = useState('all');
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customWeight, setCustomWeight] = useState('');
  const [customValue, setCustomValue] = useState('');

  // The pool the filter panel builds its dropdowns from: narrowed by the chip
  // and the search box, but *not* by the panel's own choices (see InventoryList).
  const searchPool = useMemo(() => {
    const q = deferredSearch.trim();
    let items = itemsDb;
    if (filter !== 'all') items = items.filter((item) => item._itemType === filter);
    if (q) items = items.filter((item) => itemMatchesPreparedSearch(item, q));
    return items;
  }, [itemsDb, deferredSearch, filter]);

  const addList = useItemFilters(searchPool);

  // Paging resets on a changed *query*, not on a changed array.
  const searchResetKey = `${deferredSearch.trim()}|${filter}|${addList.key}`;

  const searchResults = useMemo(() => {
    const q = deferredSearch.trim();
    const items = hasActiveItemFilters(addList.filters)
      ? searchPool.filter((item) => itemMatchesFilters(item, addList.filters))
      : searchPool;
    return q ? [...items].sort(compareItemsBySearch(q)) : items;
  }, [searchPool, deferredSearch, addList.filters]);

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    onAddItem({
      name,
      source: 'Custom',
      type: 'gear',
      custom: true,
      weight: Math.max(0, parseDecimalInput(customWeight)),
      value: Number(customValue || 0) * 100,
    });
    setCustomName('');
    setCustomWeight('');
    setCustomValue('');
  };

  return (
    <Box sx={inventorySectionSx}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: addPanelOpen ? 0.75 : 0 }}>
        <Button
          size="small"
          aria-expanded={addPanelOpen}
          onClick={() => setAddPanelOpen((prev) => !prev)}
          startIcon={addPanelOpen ? null : <Plus size={ICON_SIZES.xs} />}
          endIcon={addPanelOpen ? <ChevronDown size={ICON_SIZES.xs} /> : <ChevronRight size={ICON_SIZES.xs} />}
          sx={goldToggleSx(addPanelOpen)}
        >
          {addPanelOpen ? 'Close' : 'Add Item'}
        </Button>
      </Box>

      {addPanelOpen ? (
        <Box sx={{ pt: 0.75, borderTop: 1, borderColor: 'divider' }}>
          <SearchField
            placeholder="Search 2024 items by name, source, type, property..."
            value={search}
            onChange={setSearch}
            iconSize={14}
            sx={{ ...compactInputSx, mb: 0.5 }}
          />

          <InventoryFilterButtons value={filter} onChange={setFilter} />

          <ItemFilterPanel {...addList.panelProps} sx={{ mb: 0.5 }} />

          <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.sm, mb: 0.25 }}>
            {deferredSearch !== search
              ? 'Updating results...'
              : `${searchResults.length} of ${itemsDb.length} items`}
          </Typography>
          <SearchResultsList items={searchResults} itemsDbCount={itemsDb.length} onAddItem={onAddItem} resetKey={searchResetKey} />

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <TextField size="small" value={customName} placeholder="Add custom item..." onChange={(event) => setCustomName(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }}
              sx={{ ...compactInputSx, flex: 1, minWidth: 120 }} />
            <TextField size="small" value={customWeight} placeholder="lb" onChange={(event) => setCustomWeight(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }} sx={{ ...compactInputSx, width: 58 }} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
            <TextField size="small" type="number" value={customValue} placeholder="gp" onChange={(event) => setCustomValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }} sx={{ ...compactInputSx, width: 62 }} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
            <Button size="small" onClick={addCustom} disabled={!customName.trim()}
              sx={{ ...SURFACES.panel, px: 1.75, color: 'text.secondary', ...TEXT_STYLES.figure, fontSize: FONT_SIZES.sm, whiteSpace: 'nowrap', '&:hover': { borderColor: UI_COLORS.accent, color: UI_COLORS.accent } }}>
              + Add
            </Button>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
