import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { BeastPickerRow } from '../../../../../src/pages/charsheet/forms/BeastStatBlock.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';

// A beast as the forms database normalizes it (beasts.js).
const wolf = {
  name: 'Wolf', source: 'XPHB', size: 'M', ac: 12, hp: { average: 11, formula: '2d8 + 2' },
  speed: { walk: 40 }, abilities: { str: 14, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, cr: '1/4',
};

function renderRow(onAction = vi.fn()) {
  render(
    <SheetActionsProvider value={{ onShowToast: vi.fn(), onRoll: vi.fn() }}>
      <BeastPickerRow beast={wolf} name="Wolf" source="XPHB" summary="CR 1/4 · 11 HP" actionLabel="Transform" onAction={onAction} />
    </SheetActionsProvider>,
  );
  return onAction;
}

// A beast to take shape in opens from its chevron and from the row alike: the
// chevron's click is its own, so it never also reaches the row (which opened
// and closed the card in one click).
test('the chevron opens and closes the beast, once per click', () => {
  renderRow();
  fireEvent.click(screen.getByRole('button', { name: 'Expand Wolf' }));
  expect(screen.getByRole('button', { name: 'Collapse Wolf' })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse Wolf' }));
  expect(screen.getByRole('button', { name: 'Expand Wolf' })).toHaveAttribute('aria-expanded', 'false');
});

test('the row opens the beast too, and its action does not', () => {
  const onAction = renderRow();
  fireEvent.click(screen.getByText('CR 1/4 · 11 HP'));
  expect(screen.getByRole('button', { name: 'Collapse Wolf' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Transform' }));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Collapse Wolf' })).toBeInTheDocument();
});
