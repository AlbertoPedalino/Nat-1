import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useInventoryActions } from './useInventoryActions.js';
import InventoryStats from './InventoryStats.jsx';
import InventoryAddPanel from './InventoryAddPanel.jsx';
import InventoryList from './InventoryList.jsx';
import CustomItemDialog from './CustomItemDialog.jsx';
import { useItemsDb } from './useItemsDb.js';
import { filterByBooks } from '../../../shared/content/booksView.js';

// The sheet's inventory tab: coins, carried weight and attunement, the add-item
// search (InventoryAddPanel) and the owned items (InventoryList). Every change
// to the item list goes through useInventoryActions.
export default function InventoryTab({ C, sheet }) {
  const {
    onUpdateInventory, onUpdateCurrency, onUpdateCharacter, onNotice,
  } = useSheetActions();
  const itemsDb = useItemsDb();
  // Items to add come from the character's books; owned ones resolve in all.
  const bookItems = useMemo(() => filterByBooks(itemsDb, C), [itemsDb, C]);
  const inv = sheet?.sheetInventory || [];
  const currency = sheet?.sheetCurrency || {};
  const attunementState = useMemo(() => getCharacterAttunementState(C), [C]);
  const { addItem, editCustomItem, rowActions } = useInventoryActions({
    inv, itemsDb, character: C, attunementState, onUpdateInventory, onUpdateCharacter, onNotice,
  });

  // The made-up item dialog: { item: null } to create one, { index, item } to
  // edit one (the item as it was when opened, so the form holds still while
  // the list changes).
  const [customDialog, setCustomDialog] = useState(null);
  const invRef = useRef(inv);
  useEffect(() => { invRef.current = inv; }, [inv]);
  // Stable for the memoized rows: Edit on a made-up item opens the dialog.
  const actions = useMemo(() => ({
    ...rowActions,
    editCustom: (index) => setCustomDialog({ index, item: invRef.current[index] }),
  }), [rowActions]);
  const saveCustom = (record, qty) => {
    if (customDialog?.item) editCustomItem(customDialog.index, record);
    else addItem(record, qty);
  };

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

      <InventoryAddPanel itemsDb={bookItems} onAddItem={addItem} onCreateCustom={() => setCustomDialog({ item: null })} />

      <InventoryList
        inv={inv}
        character={C}
        itemFlagDefs={itemFlagDefs}
        attunement={rowAttunement}
        actions={actions}
      />

      <CustomItemDialog
        open={Boolean(customDialog)}
        item={customDialog?.item || null}
        onClose={() => setCustomDialog(null)}
        onSave={saveCustom}
      />
    </Box>
  );
}
