import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, Divider, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Tooltip,
  Typography,
} from '@mui/material';
import { Backpack, Coins, PackagePlus, Trash2 } from 'lucide-react';
import SearchField from '../../../shared/ui/SearchField.jsx';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { ItemNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import { CurrencyRow } from '../../../shared/character/inventory/CurrencyRow.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { ItemReferenceBody, QuantityAdder } from '../../../shared/character/inventory/ItemReference.jsx';
import { formatWeight, totalCarriedWeight } from '../../../shared/character/inventory/weight.js';
import ItemFilterPanel from '../../../shared/character/inventory/ItemFilterPanel.jsx';
import { itemMatchesFilters } from '../../../shared/character/inventory/itemFilters.js';
import { useItemFilters } from '../../../shared/character/inventory/useItemFilters.js';
import {
  ITEM_GROUP_CHIPS, OWNED_ITEM_CHIPS, matchesItemGroupChip,
} from '../../../shared/character/inventory/itemGroups.js';
import { usePagedList } from '../../../shared/ui/usePagedList.js';
import { byName } from '../../../shared/lists.js';
import { itemSearchText } from './startingEquipment.js';
import { StartingEquipmentBlock } from './StartingEquipmentBlock.jsx';
import { useDebouncedCallback } from '../../../shared/ui/useDebouncedCallback.js';
import ShowMoreButton from '../../../shared/ui/ShowMoreButton.jsx';
import { FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// Both lists render a page at a time and grow on scroll. A hard cap used to hide
// the tail of the DB, which made a broad filter look like it had only searched
// the first alphabetical slice.
const ADD_LIST_PAGE = 120;
const CURRENT_LIST_PAGE = 50;

// Search text lives in the reducer so it survives leaving the step, but every
// dispatch re-runs the whole builder reducer — so mirror it locally to keep
// typing instant and commit on a pause.
function useDebouncedSearch(value, commit) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => { setLocal(value || ''); }, [value]);
  const commitLater = useDebouncedCallback(commit, 200);
  const change = useCallback((next) => {
    setLocal(next);
    commitLater(next);
  }, [commitLater]);
  return [local, change];
}

function FilterChips({ filters, value, onChange }) {
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {filters.map((filter) => (
        <Chip
          key={filter.key}
          label={filter.label}
          color={value === filter.key ? 'primary' : 'default'}
          onClick={() => onChange(filter.key)}
        />
      ))}
    </Stack>
  );
}

// Add-list row: tap to expand the item reference (props + live rich text),
// pick a quantity, then Add. The quantity adder stops propagation so it never
// toggles the expand.
function AddItemRow({ item, onAdd }) {
  return (
    <ExpandableCard
      containerSx={{ borderBottom: 1, borderColor: 'divider' }}
      bodySx={{ px: 2, pt: 0.25, pb: 1.5 }}
      body={<ItemReferenceBody item={item} />}
      header={({ open, toggle }) => (
        <ListItemButton onClick={toggle} aria-expanded={open} sx={{ gap: 1, alignItems: 'flex-start' }}>
          <ItemNameIcon item={item} />
          <ListItemText primary={<Typography noWrap sx={{ fontWeight: FONT_WEIGHTS.regular }}>{item.name}</Typography>} />
          <QuantityAdder onAdd={(qty) => onAdd(item, qty)} sx={{ alignSelf: 'center' }} />
        </ListItemButton>
      )}
    />
  );
}

// Current-inventory row: tap the name to expand the item reference; keep the
// quantity controls and full-row remove action on the right.
function CurrentInventoryRow({ item, index, dispatch }) {
  return (
    <ExpandableCard
      containerSx={{ borderBottom: 1, borderColor: 'divider' }}
      bodySx={{ px: 2, pt: 0.25, pb: 1.5 }}
      body={<ItemReferenceBody item={item} />}
      header={({ toggle }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75 }}>
          <Box onClick={toggle} sx={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ItemNameIcon item={item} />
            <Typography sx={{ fontWeight: FONT_WEIGHTS.regular, fontSize: FONT_SIZES.xxl, minWidth: 0 }} noWrap>{item.name}</Typography>
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Button size="small" onClick={() => dispatch({ type: 'inventory/qty', index, delta: -1 })}>-</Button>
            <Typography sx={{ width: 28, textAlign: 'center' }}>{item.qty ?? 1}</Typography>
            <Button size="small" onClick={() => dispatch({ type: 'inventory/qty', index, delta: 1 })}>+</Button>
            <Tooltip title="Remove row">
              <IconButton
                size="small"
                aria-label={`Remove ${item.name}`}
                onClick={() => dispatch({ type: 'inventory/remove', index })}
                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
              >
                <Trash2 size={ICON_SIZES.md} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}
    />
  );
}

export default function EquipmentStep({ state, dispatch }) {
  const { character, search, inventoryFilter, currentInventoryFilter } = state;
  const [localQuery, setLocalQuery] = useDebouncedSearch(
    search.inventory,
    (value) => dispatch({ type: 'search/set', scope: 'inventory', value }),
  );
  const deferredQuery = useDeferredValue(localQuery);
  const query = deferredQuery.toLowerCase();

  // The pool each panel builds its dropdowns from: narrowed by the chip and the
  // search box, but not by the panel's own choices. Otherwise chip "Armor" would
  // keep offering "Martial Melee Weapon", which can only ever return nothing.
  const addPool = useMemo(() => state.data.items.filter((item) => (
    matchesItemGroupChip(item, inventoryFilter)
    && (!query || itemSearchText(item).includes(query))
  )), [state.data.items, inventoryFilter, query]);

  // Two independent advanced-filter sets: narrowing the item DB above must not
  // silently hide rows in the carried list below. Both live in the reducer, like
  // the chips and the search boxes, so leaving the step and coming back does not
  // silently drop half the query.
  const addList = useItemFilters(addPool, [
    state.inventoryFilters,
    (filters) => dispatch({ type: 'inventory/filters', filters }),
  ]);

  const sortedItems = useMemo(() => addPool
    .filter((item) => itemMatchesFilters(item, addList.filters))
    .sort((a, b) => {
      const aBase = !a.rarity || a.rarity === 'none' ? 0 : 1;
      const bBase = !b.rarity || b.rarity === 'none' ? 0 : 1;
      if (aBase !== bBase) return aBase - bBase;
      return byName(a, b);
    }), [addPool, addList.filters]);

  const addPage = usePagedList(sortedItems, {
    pageSize: ADD_LIST_PAGE,
    resetKey: `${query}|${inventoryFilter}|${addList.key}`,
  });

  const addItemWithQty = (item, qty) => dispatch({ type: 'inventory/add', item: { ...item, qty } });
  const totalWeight = totalCarriedWeight(character.inventory, character.currency);

  // Search + filter over the carried items. Keep each row's original index so
  // dispatch actions (remove/qty) still target the right inventory entry.
  const [currentQuery, setCurrentQuery] = useDebouncedSearch(
    search.currentInventory,
    (value) => dispatch({ type: 'search/set', scope: 'currentInventory', value }),
  );
  const currentSearch = currentQuery.trim().toLowerCase();
  const currentPool = useMemo(() => character.inventory
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => (
      matchesItemGroupChip(item, currentInventoryFilter)
      && (!currentSearch || itemSearchText(item).includes(currentSearch))
    )), [character.inventory, currentSearch, currentInventoryFilter]);
  const currentPoolItems = useMemo(() => currentPool.map((entry) => entry.item), [currentPool]);

  const currentList = useItemFilters(currentPoolItems, [
    state.currentInventoryFilters,
    (filters) => dispatch({ type: 'inventory/current-filters', filters }),
  ]);

  const currentInventory = useMemo(
    () => currentPool.filter(({ item }) => itemMatchesFilters(item, currentList.filters)),
    [currentPool, currentList.filters],
  );

  const currentPage = usePagedList(currentInventory, {
    pageSize: CURRENT_LIST_PAGE,
    resetKey: `${currentSearch}|${currentInventoryFilter}|${currentList.key}`,
  });

  return (
    <Stack spacing={2}>
      <BuilderPanel id="panel-equip" title="Starting Equipment" icon={PackagePlus} note="Class/background packs add items and coins to inventory.">
        <Stack spacing={1.5}>
          <StartingEquipmentBlock title={character.className} eq={character.cls?.startingEquipment} prefix="cls" character={character} items={state.data.items} dispatch={dispatch} />
          <StartingEquipmentBlock title={character.backgroundName} eq={character.backgroundObj?.startingEquipment} prefix="bg" character={character} items={state.data.items} dispatch={dispatch} />
          {!character.cls?.startingEquipment && !character.backgroundObj?.startingEquipment ? (
            <Typography sx={{ color: 'text.secondary' }}>Select class and background to see starting equipment.</Typography>
          ) : null}
        </Stack>
      </BuilderPanel>

      <BuilderPanel id="panel-currency" title="Currency" icon={Coins}>
        <CurrencyRow
          currency={character.currency}
          onCoinChange={(coin, value) => dispatch({ type: 'currency/set', coin, value })}
          onCustomAmountChange={(id, value) => dispatch({ type: 'currency/custom-update', id, patch: { amount: value } })}
          onCustomMetaChange={(id, patch) => dispatch({ type: 'currency/custom-update', id, patch })}
          onCustomRemove={(id) => dispatch({ type: 'currency/custom-remove', id })}
          onCustomAdd={() => dispatch({ type: 'currency/custom-add' })}
          onReorder={(key, dir) => dispatch({ type: 'currency/reorder', key, dir })}
        />
      </BuilderPanel>

      <BuilderPanel id="panel-inventory" title="Inventory" icon={Backpack} note={`${formatWeight(totalWeight)} lb carried`}>
        <Stack spacing={1.5}>
          <SearchField
            value={localQuery}
            onChange={setLocalQuery}
            placeholder="Search items"
            size="medium"
            iconSize={18}
          />
          <FilterChips
            filters={ITEM_GROUP_CHIPS}
            value={inventoryFilter}
            onChange={(key) => dispatch({ type: 'inventory/filter', filter: key })}
          />

          <ItemFilterPanel {...addList.panelProps} />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {sortedItems.length} of {state.data.items.length} items
          </Typography>

          <Paper variant="outlined" {...addPage.listProps} sx={{ maxHeight: 430, overflow: 'auto' }}>
            <List dense disablePadding>
              {addPage.visible.map((item) => (
                <AddItemRow key={`${item.name}-${item.source}`} item={item} onAdd={addItemWithQty} />
              ))}
            </List>
            <ShowMoreButton page={addPage} sx={{ py: 1 }} />
          </Paper>

          <Divider />
          <Typography variant="h2">Current Inventory</Typography>
          {character.inventory.length ? (
            <>
              <SearchField
                value={currentQuery}
                onChange={setCurrentQuery}
                placeholder="Search current inventory"
                size="medium"
                iconSize={18}
              />
              <FilterChips
                filters={OWNED_ITEM_CHIPS}
                value={currentInventoryFilter}
                onChange={(filter) => dispatch({ type: 'inventory/current-filter', filter })}
              />
              <ItemFilterPanel {...currentList.panelProps} />
            </>
          ) : null}
          <Paper variant="outlined" {...currentPage.listProps} sx={{ maxHeight: 430, overflow: 'auto' }}>
            <List dense disablePadding>
              {currentPage.visible.map(({ item, index }) => (
                <CurrentInventoryRow key={`${item.name}-${index}`} item={item} index={index} dispatch={dispatch} />
              ))}
              {character.inventory.length && !currentInventory.length ? (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', px: 2, py: 1 }}>
                  No matches.
                </Typography>
              ) : null}
            </List>
            <ShowMoreButton page={currentPage} sx={{ py: 1 }} />
          </Paper>
        </Stack>
      </BuilderPanel>
    </Stack>
  );
}
