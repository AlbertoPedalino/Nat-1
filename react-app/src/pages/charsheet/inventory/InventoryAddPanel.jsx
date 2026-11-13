import { memo, useDeferredValue, useMemo, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { ItemAddRow } from '../../../shared/character/inventory/ItemReference.jsx';
import ItemGroupFilter from '../../../shared/character/inventory/ItemGroupFilter.jsx';
import { useItemListQuery } from '../../../shared/character/inventory/useItemListQuery.js';
import ItemFilterPanel from '../../../shared/character/inventory/ItemFilterPanel.jsx';
import { usePagedList } from '../../../shared/ui/usePagedList.js';
import { compareItemsBySearch } from '../../../shared/character/inventory/itemSearch.js';
import { inventorySectionSx } from './inventoryControls.jsx';
import { COMPACT_INPUT_SX } from '../../../shared/ui/controlHeights.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import DisclosureButton from '../../../shared/ui/DisclosureButton.jsx';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import { SURFACES, scrollWellSx } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CARD_PART_RULE_SX } from '../../../shared/ui/interactive.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import { LoadingLine } from '../../../shared/ui/LoadStatus.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ITEM_ATTUNEMENT } from '../../../shared/ui/entityColors.js';

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

const SearchResultsList = memo(function SearchResultsList({ items, itemsDbCount, onAddItem, resetKey }) {
  const page = usePagedList(items, { pageSize: SEARCH_PAGE, resetKey });
  const { visible, listProps } = page;

  return (
    <Box {...listProps} sx={{ ...scrollWellSx(320), mb: 0.75 }}>
      {visible.map((item) => (
        <ItemAddRow key={`${item.name}-${item.source}`} item={item} onAdd={onAddItem} />
      ))}
      {!items.length && (
        itemsDbCount ? <EmptyLine inList>No items found.</EmptyLine> : <LoadingLine label="Loading items…" sx={{ px: 1, py: 1.25 }} />
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
  const [filter, setFilter] = useState([]);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customWeight, setCustomWeight] = useState('');
  const [customValue, setCustomValue] = useState('');

  // Database items, narrowed and ordered as on every item list
  // (useItemListQuery); the order is relevance to the search.
  const query = deferredSearch.trim();
  const compare = useMemo(() => compareItemsBySearch(query), [query]);
  const { results: searchResults, filterList: addList, resetKey: searchResetKey } = useItemListQuery(itemsDb, { chip: filter, query, compare });

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
        <DisclosureButton
          open={addPanelOpen}
          onToggle={() => setAddPanelOpen((prev) => !prev)}
          icon={addPanelOpen ? null : <Plus size={ICON_SIZES.xs} />}
          label={addPanelOpen ? 'Close' : 'Add Item'}
        />
      </Box>

      <CollapsibleBody open={addPanelOpen}>
        <Box sx={{ pt: 0.75, ...CARD_PART_RULE_SX }}>
          <SearchField
            placeholder="Search 2024 items by name, source, type, property..."
            value={search}
            onChange={setSearch}
            density="compact"
            sx={{ mb: 0.5 }}
          />

          <ItemGroupFilter value={filter} onChange={setFilter} />

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
              sx={{ flex: 1, minWidth: 120 }} />
            <TextField size="small" value={customWeight} placeholder="lb" onChange={(event) => setCustomWeight(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }} sx={{ ...COMPACT_INPUT_SX, width: 58 }} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
            <TextField size="small" type="number" value={customValue} placeholder="gp" onChange={(event) => setCustomValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }} sx={{ ...COMPACT_INPUT_SX, width: 62 }} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
            <Button size="small" onClick={addCustom} disabled={!customName.trim()}
              sx={{ ...SURFACES.panel, px: 1.75, color: 'text.secondary', whiteSpace: 'nowrap', '&:hover': { borderColor: ITEM_ATTUNEMENT, color: 'text.primary' } }}>
              + Add
            </Button>
          </Box>
        </Box>
      </CollapsibleBody>
    </Box>
  );
}
