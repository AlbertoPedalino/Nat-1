import { useMemo } from 'react';
import { adapterRegistry } from '../../../adapters/registry.js';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import ItemPickToggle from './ItemPickToggle.jsx';
import DetailPanel, { DetailNote } from '../layout/DetailPanel.jsx';
import { hasItemFlag, itemFlagFitsItem, toggleItemFlag } from '../../../shared/character/inventory/itemFlags.js';
import { itemPickKey, itemPickOptions } from '../../../shared/character/inventory/replicateMagicItem.js';
import { isWeaponItem } from '../../../shared/character/inventory/itemKinds.js';

// The card of a feature that marks one inventory item (Arcane Firearm): its
// adapter names the item flag (`itemFlag`), and the card picks the item that
// carries it. The flag belongs to the item, so the Inventory tab's button on
// the item sets the same one and the two always agree (a choice made per cast,
// like True Strike's weapon, stays on its spell card instead). The row of
// items reads like every item pick (itemPickOptions); picking another moves
// the flag, pressing the lit one clears it.
export default function ItemFlagPickerPanel({ action, sheet }) {
  const { onUpdateInventory, readOnly } = useSheetActions();
  const def = adapterRegistry.getItemFlagDef(action?.itemFlag);
  const inventory = sheet?.sheetInventory || [];

  // One option per distinct item; the copy holding the flag stands for it.
  const options = useMemo(() => {
    const fitting = inventory.filter((item) => itemFlagFitsItem(def, item));
    return itemPickOptions(fitting).map((option) => {
      const holder = fitting.find((item) => itemPickKey(item) === option.key && hasItemFlag(item, def?.key));
      const item = holder || option.item;
      return { ...option, item, index: inventory.indexOf(item) };
    });
  }, [def, inventory]);
  const picked = options.find(({ item }) => hasItemFlag(item, def?.key)) || null;

  if (!def) return null;

  const pick = (value) => {
    if (readOnly || !onUpdateInventory) return;
    // Clearing presses the lit item again: toggling it takes the flag off.
    const option = value == null ? picked : options.find(({ key }) => key === value);
    if (!option) return;
    const next = toggleItemFlag(inventory, option.index, def);
    if (next !== inventory) onUpdateInventory(next);
  };

  const dice = def.weaponDamageDice;
  return (
    <DetailPanel title={def.label} meta={picked ? picked.label : 'None'}>
      <ItemPickToggle
        options={options}
        value={picked ? picked.key : null}
        onChange={pick}
        allowClear
        disabled={readOnly}
        emptyText="No item in your inventory can take it."
      />
      {picked && dice ? (
        <DetailNote>
          {isWeaponItem(picked.item)
            ? `+${dice} joins this weapon's damage roll, on its card and through True Strike.`
            : `+${dice} to one damage roll of an Artificer spell cast through it.`}
        </DetailNote>
      ) : null}
    </DetailPanel>
  );
}
