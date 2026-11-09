import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { adapterRegistry } from '../../../adapters/index.js';
import { availableItemFlagDefs } from '../../../shared/character/inventory/itemFlags.js';
import { countAttunedItems } from '../../../shared/character/inventory/itemAttunement.js';
import { getCharacterAttunementState } from './attunement.js';
import { CurrencyRow } from '../../../shared/character/inventory/CurrencyRow.jsx';
import {
  setCoinAmount,
  updateCustomCurrency,
} from '../../../shared/character/inventory/currency.js';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { loadItemsCached } from './itemSearch.js';
import { useInventoryActions } from './useInventoryActions.js';
import InventoryStats from './InventoryStats.jsx';
import InventoryAddPanel from './InventoryAddPanel.jsx';
import InventoryList from './InventoryList.jsx';

// The sheet's inventory tab: coins, carried weight and attunement, the add-item
// search (InventoryAddPanel) and the owned items (InventoryList). Every change
// to the item list goes through useInventoryActions.
export default function InventoryTab({ C, sheet }) {
  const {
    onUpdateInventory, onUpdateCurrency, onUpdateCharacter, onNotice,
  } = useSheetActions();
  const [itemsDb, setItemsDb] = useState([]);
  const inv = sheet?.sheetInventory || [];
  const currency = sheet?.sheetCurrency || {};
  const attunementState = useMemo(() => getCharacterAttunementState(C), [C]);
  const { addItem, rowActions } = useInventoryActions({
    inv, itemsDb, character: C, attunementState, onUpdateInventory, onUpdateCharacter, onNotice,
  });

  useEffect(() => {
    let alive = true;
    loadItemsCached().then((items) => {
      if (alive) setItemsDb(items);
    }).catch(() => {
      if (alive) setItemsDb([]);
    });
    return () => { alive = false; };
  }, []);

  const attunementFull = useMemo(
    () => countAttunedItems(inv) >= attunementState.limit,
    [attunementState.limit, inv],
  );

  // Flags a class feature lets the player put on an item (Pact Weapon, Arcane
  // Armor…), declared by the adapters with registerItemFlagDef.
  const itemFlagDefs = useMemo(() => availableItemFlagDefs(adapterRegistry.getAllItemFlagDefs(), C), [C]);

  const updateCoin = useCallback((coin, value) => {
    onUpdateCurrency?.(setCoinAmount(currency, coin, value));
  }, [currency, onUpdateCurrency]);

  // Custom currencies are created in the builder; the sheet only adjusts amounts.
  const updateCustomAmount = useCallback((id, value) => {
    onUpdateCurrency?.(updateCustomCurrency(currency, id, { amount: value }));
  }, [currency, onUpdateCurrency]);

  // Stable for the memoized rows: every row receives the same object.
  const rowAttunement = useMemo(() => ({
    full: attunementFull,
    context: attunementState.context,
    limit: attunementState.limit,
  }), [attunementFull, attunementState]);

  return (
    <Box>
      <CurrencyRow
        mode="sheet"
        currency={currency}
        onCoinChange={updateCoin}
        onCustomAmountChange={updateCustomAmount}
        sx={{ mb: 0.75 }}
      />

      <InventoryStats inv={inv} currency={currency} character={C} attunementLimit={attunementState.limit} />

      <InventoryAddPanel itemsDb={itemsDb} onAddItem={addItem} />

      <InventoryList
        inv={inv}
        character={C}
        itemFlagDefs={itemFlagDefs}
        attunement={rowAttunement}
        actions={rowActions}
      />
    </Box>
  );
}
