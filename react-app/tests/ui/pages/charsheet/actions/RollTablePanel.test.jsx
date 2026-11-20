import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import RollTablePanel from '../../../../../src/pages/charsheet/actions/RollTablePanel.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';

// A two-row d100 stand-in for the Wild Magic Surge table of the game data.
vi.mock('../../../../../src/shared/character/dice/rollTables.js', async (importOriginal) => ({
  ...(await importOriginal()),
  loadRollTable: () => Promise.resolve({
    name: 'Wild Magic Surge Table', sides: 100,
    rows: [{ low: 1, high: 50, range: '01-50', effect: 'Low' }, { low: 51, high: 100, range: '51-00', effect: 'High' }],
  }),
}));

const card = (ownerLevel) => ({
  name: 'Wild Magic Surge', ownerLevel,
  rollTable: { key: 'wildMagicSurge', twice: { fromLevel: 14, feature: 'Controlled Chaos' } },
});

function renderPanel(ownerLevel, onShowToast = vi.fn()) {
  render(
    <SheetActionsProvider value={{ onShowToast }}>
      <RollTablePanel action={card(ownerLevel)} />
    </SheetActionsProvider>,
  );
  return onShowToast;
}

test('the surge rolls once on the table of the game data', async () => {
  const onShowToast = renderPanel(13);
  fireEvent.click(await screen.findByRole('button', { name: 'Roll d100' }));
  expect(onShowToast).toHaveBeenCalledTimes(1);
  expect(onShowToast.mock.calls[0][0]).toBe('Wild Magic Surge Table');
  expect(onShowToast.mock.calls[0][3]).toHaveLength(1);
});

test('from Controlled Chaos the surge rolls twice and lets the player pick', async () => {
  const onShowToast = renderPanel(14);
  fireEvent.click(await screen.findByRole('button', { name: 'Roll Twice (Controlled Chaos)' }));
  expect(onShowToast.mock.calls[0][3]).toHaveLength(2);
  expect(screen.getByText('Choose one:')).toBeInTheDocument();
});
