import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installArtillerist from '../../../../../src/adapters/classes/artificer/artillerist.js';
import ItemFlagPickerPanel from '../../../../../src/pages/charsheet/inventory/ItemFlagPickerPanel.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';

installArtillerist(adapterRegistry);

// The Arcane Firearm card picks the item carrying the sigils: only a rod,
// staff, wand or martial ranged weapon, and one at a time.
const card = adapterRegistry.getSubclassSheetActions('Artificer', 'Artillerist')
  .find((action) => action.name === 'Arcane Firearm');
const inventory = [
  { name: 'Light Crossbow', type: 'R', weaponCategory: 'simple', dmg1: '1d8' },
  { name: 'Heavy Crossbow', type: 'R', weaponCategory: 'martial', dmg1: '1d10', flags: ['arcaneFirearm'] },
  { name: 'Wand', type: 'WD' },
];

function renderPanel(onUpdateInventory) {
  render(
    <SheetActionsProvider value={{ onUpdateInventory }}>
      <ItemFlagPickerPanel action={card} sheet={{ sheetInventory: inventory }} />
    </SheetActionsProvider>,
  );
}

test('the card offers only the items that can take the sigils, the carved one lit', () => {
  renderPanel(vi.fn());
  expect(card).toMatchObject({ detailType: 'itemFlagPicker', itemFlag: 'arcaneFirearm', minLevel: 5 });
  expect(screen.queryByRole('button', { name: 'Light Crossbow' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Heavy Crossbow' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Wand' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText(/\+1d8 joins this weapon's damage roll/)).toBeInTheDocument();
});

test('carving the sigils on another item moves them; pressing the lit one clears them', () => {
  const onUpdateInventory = vi.fn();
  renderPanel(onUpdateInventory);
  fireEvent.click(screen.getByRole('button', { name: 'Wand' }));
  expect(onUpdateInventory.mock.calls[0][0].map((item) => item.flags || [])).toEqual([[], [], ['arcaneFirearm']]);
  fireEvent.click(screen.getByRole('button', { name: 'Heavy Crossbow' }));
  expect(onUpdateInventory.mock.calls[1][0].map((item) => item.flags || [])).toEqual([[], [], []]);
});
