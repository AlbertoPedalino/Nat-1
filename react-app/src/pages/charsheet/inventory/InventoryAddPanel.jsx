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
  ShowMoreButton,
  compactInputSx,
  inventorySectionSx,
} from './inventoryControls.jsx';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

// The result list renders in pages instead of hard-capping: a broad filter can
// legitimately match most of the item DB (~2500 entries once magic variants are
// expanded, so most searches overflow any fixed cap), and truncating
// made it look like the filter had only searched the first alphabetical slice.
// 120 rows a page: the old hard cap rendered that many at once, so the DOM cost
// is known to be fine, and it takes fewer scrolls to cross a ~2500-item DB.
const SEARCH_PAGE = 120;

const addPanelToggleSx = (open) => ({
  minHeight: 0,
  px: '12px',
  py: '4px',
  border: 1,
  borderColor: open ? UI_COLORS.gold : 'divider',
  borderRadius: 1,
  bgcolor: open ? uiAlpha(UI_COLORS.gold, 0.14) : UI_COLORS.headerBg,
  color: open ? UI_COLORS.goldLight : 'text.secondary',
  fontFamily: UI_FONTS.display,
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  '&:hover': {
    borderColor: UI_COLORS.gold,
    color: UI_COLORS.goldLight,
    bgcolor: open ? uiAlpha(UI_COLORS.gold, 0.18) : uiAlpha(UI_COLORS.gold, 0.08),
  },
});

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
      containerSx={{ flexShrink: 0, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: UI_COLORS.headerBg, overflow: 'hidden', '&:hover': { borderColor: UI_COLORS.gold } }}
      detailsSx={{ px: '10px', pt: '2px', pb: '8px', bgcolor: UI_COLORS.ink, fontSize: '0.7rem', color: 'text.secondary' }}
      details={<ItemReferenceBody item={item} />}
      summary={({ toggle }) => (
        <Box onClick={toggle} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '10px', py: '5px', cursor: 'pointer' }}>
          <ItemNameIcon item={item} />
          <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem', color: 'text.primary' }}>{item.name}</Typography>
          <QuantityAdder onAdd={(qty) => onAdd(item, qty)} addColor="success" />
        </Box>
      )}
    />
  );
}

const SearchResultsList = memo(function SearchResultsList({ items, itemsDbCount, onAddItem, resetKey }) {
  const { visible, remaining, showMore, listProps } = usePagedList(items, { pageSize: SEARCH_PAGE, resetKey });

  return (
    <Box {...listProps} sx={{ maxHeight: 320, overflowY: 'auto', mb: 0.75, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: uiAlpha(UI_COLORS.ink, 0.65), p: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {visible.map((item) => (
        <AddResultRow key={`${item.name}-${item.source}`} item={item} onAdd={onAddItem} />
      ))}
      {remaining > 0 ? <ShowMoreButton remaining={remaining} onClick={showMore} /> : null}
      {!items.length && (
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic', py: 0.75, px: 1 }}>
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
          startIcon={addPanelOpen ? null : <Plus size={12} />}
          endIcon={addPanelOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          sx={addPanelToggleSx(addPanelOpen)}
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

          <ItemFilterPanel {...addList.panelProps} sx={{ mb: 0.6 }} />

          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic', mb: 0.3 }}>
            {deferredSearch !== search
              ? 'Updating results...'
              : `${searchResults.length} of ${itemsDb.length} items`}
          </Typography>
          <SearchResultsList items={searchResults} itemsDbCount={itemsDb.length} onAddItem={onAddItem} resetKey={searchResetKey} />

          <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <TextField size="small" value={customName} placeholder="Add custom item..." onChange={(event) => setCustomName(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }}
              sx={{ ...compactInputSx, flex: 1, minWidth: 120 }} />
            <TextField size="small" value={customWeight} placeholder="lb" onChange={(event) => setCustomWeight(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }} sx={{ ...compactInputSx, width: 58 }} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
            <TextField size="small" type="number" value={customValue} placeholder="gp" onChange={(event) => setCustomValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }} sx={{ ...compactInputSx, width: 62 }} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
            <Button size="small" onClick={addCustom} disabled={!customName.trim()}
              sx={{ px: '14px', border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: UI_COLORS.headerBg, color: 'text.secondary', fontFamily: UI_FONTS.display, fontSize: '0.65rem', whiteSpace: 'nowrap', '&:hover': { borderColor: UI_COLORS.gold, color: UI_COLORS.gold } }}>
              + Add
            </Button>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
