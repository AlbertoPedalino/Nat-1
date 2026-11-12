import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Box, Divider, List, Stack, Typography } from '@mui/material';
import { Trash2 } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { ItemNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import { CurrencyRow } from '../../../shared/character/inventory/CurrencyRow.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { ItemAddRow, ItemReferenceBody } from '../../../shared/character/inventory/ItemReference.jsx';
import ItemGroupFilter from '../../../shared/character/inventory/ItemGroupFilter.jsx';
import { useItemListQuery } from '../../../shared/character/inventory/useItemListQuery.js';
import { compareItemsBySearch } from '../../../shared/character/inventory/itemSearch.js';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import { stepButtonSx } from '../../../shared/ui/pressable.js';
import { formatPounds, itemQty, totalCarriedWeight } from '../../../shared/character/inventory/weight.js';
import ItemFilterPanel from '../../../shared/character/inventory/ItemFilterPanel.jsx';
import { OWNED_ITEM_CHIPS } from '../../../shared/character/inventory/itemGroups.js';
import { usePagedList } from '../../../shared/ui/usePagedList.js';
import { StartingEquipmentBlock } from './StartingEquipmentBlock.jsx';
import { useDebouncedCallback } from '../../../shared/ui/useDebouncedCallback.js';
import ShowMoreButton from '../../../shared/ui/ShowMoreButton.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { BUILDER_TEXT } from '../layout/builderText.js';
import { ENTITY_COLORS } from '../../../shared/ui/entityColors.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';
import { scrollWellSx } from '../../../shared/ui/surfaces.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';
import SelectionSearch from '../choices/SelectionSearch.jsx';

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

// Current-inventory row: tap the name to expand the item reference; keep the
// quantity controls and full-row remove action on the right.
function CurrentInventoryRow({ item, index, dispatch }) {
  return (
    <ExpandableCard
      containerSx={{ ...LIST_ROW_RULE_SX }}
      detailsSx={{ px: 2, pt: 0.25, pb: 1.5 }}
      details={<ItemReferenceBody item={item} />}
      summary={({ toggle }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75 }}>
          <Box onClick={toggle} sx={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ItemNameIcon item={item} />
            <Typography sx={{ ...BUILDER_TEXT.itemName, minWidth: 0 }} noWrap>{item.name}</Typography>
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <CountStepper value={itemQty(item)} label={`${item.name} quantity`} onStep={(delta) => dispatch({ type: 'inventory/qty', index, delta })} />
            <TipIconButton title="Remove row" size="small" ariaLabel={`Remove ${item.name}`} onClick={() => dispatch({ type: 'inventory/remove', index })} sx={stepButtonSx(20, { danger: true })}>
              <Trash2 size={ICON_SIZES.xs} />
            </TipIconButton>
          </Stack>
        </Box>
      )}
    />
  );
}

// An owned row's item (rows keep their inventory index beside it).
const entryItem = (entry) => entry.item;

export default function EquipmentStep({ state, dispatch }) {
  const { character, search, inventoryFilter, currentInventoryFilter } = state;
  const [localQuery, setLocalQuery] = useDebouncedSearch(
    search.inventory,
    (value) => dispatch({ type: 'search/set', scope: 'inventory', value }),
  );
  const deferredQuery = useDeferredValue(localQuery);
  const query = deferredQuery.toLowerCase();

  // The item database, narrowed and ordered as on every item list
  // (useItemListQuery, compareItemsBySearch). Its advanced filters live in the
  // reducer, like the chips and the search boxes, so leaving the step and
  // coming back keeps the whole query.
  const compare = useMemo(() => compareItemsBySearch(query), [query]);
  const { results: sortedItems, filterList: addList, resetKey: addResetKey } = useItemListQuery(state.data.items, {
    chip: inventoryFilter,
    query,
    compare,
    filtersState: [state.inventoryFilters, (filters) => dispatch({ type: 'inventory/filters', filters })],
  });
  const addPage = usePagedList(sortedItems, { pageSize: ADD_LIST_PAGE, resetKey: addResetKey });

  const addItemWithQty = (item, qty) => dispatch({ type: 'inventory/add', item: { ...item, qty } });
  const totalWeight = totalCarriedWeight(character.inventory, character.currency);

  // Search + filter over the carried items. Keep each row's original index so
  // dispatch actions (remove/qty) still target the right inventory entry.
  const [currentQuery, setCurrentQuery] = useDebouncedSearch(
    search.currentInventory,
    (value) => dispatch({ type: 'search/set', scope: 'currentInventory', value }),
  );
  const currentEntries = useMemo(() => character.inventory.map((item, index) => ({ item, index })), [character.inventory]);
  const { results: currentInventory, filterList: currentList, resetKey: currentResetKey } = useItemListQuery(currentEntries, {
    chip: currentInventoryFilter,
    query: currentQuery,
    getItem: entryItem,
    filtersState: [state.currentInventoryFilters, (filters) => dispatch({ type: 'inventory/current-filters', filters })],
  });
  const currentPage = usePagedList(currentInventory, { pageSize: CURRENT_LIST_PAGE, resetKey: currentResetKey });

  return (
    <Stack spacing={2}>
      <BuilderPanel id="panel-equip" tone={ENTITY_COLORS.tool} title="Starting Equipment" icon={GAME_ICONS.equipment} note="Class/background packs add items and coins to inventory.">
        <Stack spacing={1.5}>
          <StartingEquipmentBlock title={character.className} eq={character.cls?.startingEquipment} prefix="cls" character={character} items={state.data.items} dispatch={dispatch} />
          <StartingEquipmentBlock title={character.backgroundName} eq={character.backgroundObj?.startingEquipment} prefix="bg" character={character} items={state.data.items} dispatch={dispatch} />
          {!character.cls?.startingEquipment && !character.backgroundObj?.startingEquipment ? (
            <EmptyLine>Select class and background to see starting equipment.</EmptyLine>
          ) : null}
        </Stack>
      </BuilderPanel>

      <BuilderPanel id="panel-currency" tone={ENTITY_COLORS.tool} title="Currency" icon={GAME_ICONS.currency}>
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

      <BuilderPanel id="panel-inventory" tone={ENTITY_COLORS.tool} title="Inventory" icon={GAME_ICONS.inventory} note={`${formatPounds(totalWeight)} carried`}>
        <Stack spacing={1.5}>
          <SelectionSearch
            value={localQuery}
            onChange={setLocalQuery}
            placeholder="Search items"
          />
          <ItemGroupFilter
            value={inventoryFilter}
            onChange={(key) => dispatch({ type: 'inventory/filter', filter: key })}
          />

          <ItemFilterPanel {...addList.panelProps} />

          <Typography sx={BUILDER_TEXT.hint}>
            {sortedItems.length} of {state.data.items.length} items
          </Typography>

          <Box {...addPage.listProps} sx={scrollWellSx(430)}>
            <Box sx={{ p: 0.5 }}>
              {addPage.visible.map((item) => (
                <ItemAddRow key={`${item.name}-${item.source}`} item={item} onAdd={addItemWithQty} />
              ))}
            </Box>
            <ShowMoreButton page={addPage} sx={{ py: 1 }} />
          </Box>

          <Divider />
          <Typography sx={BUILDER_TEXT.sectionHeader}>Current Inventory</Typography>
          {character.inventory.length ? (
            <>
              <SelectionSearch
                value={currentQuery}
                onChange={setCurrentQuery}
                placeholder="Search current inventory"
              />
              <ItemGroupFilter
                chips={OWNED_ITEM_CHIPS}
                value={currentInventoryFilter}
                onChange={(filter) => dispatch({ type: 'inventory/current-filter', filter })}
              />
              <ItemFilterPanel {...currentList.panelProps} />
            </>
          ) : null}
          <Box {...currentPage.listProps} sx={scrollWellSx(430)}>
            <List dense disablePadding>
              {currentPage.visible.map(({ item, index }) => (
                <CurrentInventoryRow key={`${item.name}-${index}`} item={item} index={index} dispatch={dispatch} />
              ))}
              {character.inventory.length && !currentInventory.length ? (
                <EmptyLine inList>No matches.</EmptyLine>
              ) : null}
            </List>
            <ShowMoreButton page={currentPage} sx={{ py: 1 }} />
          </Box>
        </Stack>
      </BuilderPanel>
    </Stack>
  );
}
