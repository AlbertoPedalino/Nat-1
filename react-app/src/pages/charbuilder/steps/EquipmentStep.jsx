import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { Package, Plus, Trash2 } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { CurrencyRow } from '../../../shared/character/inventory/CurrencyRow.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { ENTRY_BODY_SX, ENTRY_CARD_SX, ENTRY_ROW_PADDING } from '../../../shared/ui/entryCard.js';
import {
  ItemAddRow, ItemCardTitle, ItemReferenceBody, itemCardSurfaceSx,
} from '../../../shared/character/inventory/ItemReference.jsx';
import ItemBrowser, { ItemListSection } from '../../../shared/character/inventory/ItemBrowser.jsx';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import { stepButtonSx } from '../../../shared/ui/pressable.js';
import { formatPounds, itemQty, totalCarriedWeight } from '../../../shared/character/inventory/weight.js';
import { StartingEquipmentBlock } from './StartingEquipmentBlock.jsx';
import { useDebouncedCallback } from '../../../shared/ui/useDebouncedCallback.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';

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
// An owned item, carded as on the sheet (the shared item head, a magic
// item's rarity wash), with its quantity and its removal.
function CurrentInventoryRow({ item, index, dispatch }) {
  return (
    <ExpandableCard
      containerSx={{ ...ENTRY_CARD_SX, mb: 0.5 }}
      detailsSx={ENTRY_BODY_SX}
      details={<ItemReferenceBody item={item} />}
      summary={({ toggle }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ...ENTRY_ROW_PADDING, ...itemCardSurfaceSx(item) }}>
          <Box onClick={toggle} sx={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex' }}>
            <ItemCardTitle item={item} />
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
  // The current inventory's state filters (Equipped, Attuned, Stashed).
  const currentStates = useState([]);
  const { character, search, inventoryFilter, currentInventoryFilter } = state;
  const addSearch = useDebouncedSearch(
    search.inventory,
    (value) => dispatch({ type: 'search/set', scope: 'inventory', value }),
  );
  const currentSearch = useDebouncedSearch(
    search.currentInventory,
    (value) => dispatch({ type: 'search/set', scope: 'currentInventory', value }),
  );
  const totalWeight = totalCarriedWeight(character.inventory, character.currency);
  // Owned rows keep their inventory index, so remove and quantity still target
  // the right entry.
  const currentEntries = useMemo(() => character.inventory.map((item, index) => ({ item, index })), [character.inventory]);

  const renderAddRows = useCallback((visible) => visible.map((item) => (
    <ItemAddRow key={`${item.name}-${item.source}`} item={item} onAdd={(it, qty) => dispatch({ type: 'inventory/add', item: { ...it, qty } })} />
  )), [dispatch]);
  const renderCurrentRows = useCallback((visible) => visible.map(({ item, index }) => (
    <CurrentInventoryRow key={`${item.name}-${index}`} item={item} index={index} dispatch={dispatch} />
  )), [dispatch]);

  return (
    <Stack spacing={2}>
      <BuilderPanel id="panel-equip" tone={PANEL_TONES.items} title="Starting Equipment" icon={GAME_ICONS.equipment} note="Class/background packs add items and coins to inventory.">
        <Stack spacing={1.5}>
          <StartingEquipmentBlock title={character.className} eq={character.cls?.startingEquipment} prefix="cls" character={character} items={state.data.items} dispatch={dispatch} />
          <StartingEquipmentBlock title={character.backgroundName} eq={character.backgroundObj?.startingEquipment} prefix="bg" character={character} items={state.data.items} dispatch={dispatch} />
          {!character.cls?.startingEquipment && !character.backgroundObj?.startingEquipment ? (
            <EmptyLine>Select class and background to see starting equipment.</EmptyLine>
          ) : null}
        </Stack>
      </BuilderPanel>

      <BuilderPanel id="panel-currency" tone={PANEL_TONES.items} title="Currency" icon={GAME_ICONS.currency}>
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

      <BuilderPanel id="panel-inventory" tone={PANEL_TONES.items} title="Inventory" icon={GAME_ICONS.inventory} note={`${formatPounds(totalWeight)} carried`}>
        <Stack spacing={1.5}>
          <ItemListSection icon={Plus} title="Add items">
            <ItemBrowser
              entries={state.data.items}
              search={addSearch}
              chips={[inventoryFilter, (filter) => dispatch({ type: 'inventory/filter', filter })]}
              filtersState={[state.inventoryFilters, (filters) => dispatch({ type: 'inventory/filters', filters })]}
              order="search"
              pageSize={ADD_LIST_PAGE}
              renderRows={renderAddRows}
            />
          </ItemListSection>
          <ItemListSection icon={Package} title="Current inventory">
            <ItemBrowser
              entries={currentEntries}
              getItem={entryItem}
              search={currentSearch}
              chips={[currentInventoryFilter, (filter) => dispatch({ type: 'inventory/current-filter', filter })]}
              states={currentStates}
              filtersState={[state.currentInventoryFilters, (filters) => dispatch({ type: 'inventory/current-filters', filters })]}
              pageSize={CURRENT_LIST_PAGE}
              renderRows={renderCurrentRows}
              empty={<EmptyLine inList>No items yet.</EmptyLine>}
            />
          </ItemListSection>
        </Stack>
      </BuilderPanel>
    </Stack>
  );
}
