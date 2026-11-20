import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installDruid from '../../../../../src/adapters/classes/druid/druid.js';
import { AdapterActionCard } from '../../../../../src/pages/charsheet/actions/AdapterActionCard.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';

installDruid(adapterRegistry);

// Wild Resurgence: one card. Its use, once per Long Rest, is a gem; the slot
// for a Wild Shape use, there whenever wanted, a button. Each row says what it
// does.
test('Wild Resurgence: a labelled gem for its Long Rest use, a labelled button for the rest', () => {
  const card = adapterRegistry.getClassSheetActions('Druid').find((action) => action.name === 'Wild Resurgence');
  const onResChange = vi.fn();
  const onEffect = vi.fn();
  render(
    <SheetActionsProvider value={{}}>
      <AdapterActionCard
        action={card} resources={{ wild_resurgence: 1 }} resMax={1}
        onResChange={onResChange} onEffect={onEffect}
      />
    </SheetActionsProvider>,
  );

  expect(screen.getByText('Wild Shape → Level 1 Slot')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Wild Resurgence: spend use' }));
  expect(onResChange).toHaveBeenCalledWith('wild_resurgence', -1);

  const shapeRow = screen.getByText('Spell Slot → Wild Shape').parentElement;
  fireEvent.click(within(shapeRow).getByRole('button', { name: 'Use' }));
  expect(onEffect).toHaveBeenCalledWith('wild_resurgence_shape');
});
