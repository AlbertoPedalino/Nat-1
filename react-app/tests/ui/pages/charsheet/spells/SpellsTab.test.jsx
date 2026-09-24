import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import SpellsTab from '../../../../../src/pages/charsheet/spells/SpellsTab.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';
import { ProficiencySetsProvider } from '../../../../../src/pages/charsheet/proficiency/ProficiencySetsContext.jsx';
import { theme } from '../../../../../src/app/theme.js';

const loaders = vi.hoisted(() => ({
  loadSpells: vi.fn(), loadCoreAdapters: vi.fn(), loadClassAdapters: vi.fn(), loadSpellsAdapters: vi.fn(),
}));
vi.mock('../../../../../src/pages/charbuilder/data/dataLoaders.js', () => ({ loadSpells: loaders.loadSpells }));
vi.mock('../../../../../src/adapters/index.js', async () => ({
  ...loaders,
  installedRegistry: (await import('../../../../../src/adapters/registry.js')).adapterRegistry,
}));

const catalog = {
  spells: [{ name: 'Levitate', source: 'XPHB', level: 2, entries: ['The target rises into the air.'] }],
  classSpellIndex: {}, failedFiles: [],
};
const character = (attuned) => ({
  className: 'Fighter', level: 1,
  inventory: [{ name: 'Boots of Levitation', reqAttune: true, attuned, attachedSpells: ['levitate|xphb'] }],
});
const view = (C) => (
  <ThemeProvider theme={theme}>
    <SheetActionsProvider value={{}}>
      <ProficiencySetsProvider character={C}><SpellsTab C={C} sheet={{}} /></ProficiencySetsProvider>
    </SheetActionsProvider>
  </ThemeProvider>
);

beforeEach(() => {
  vi.resetAllMocks();
  loaders.loadSpells.mockResolvedValue(catalog);
  for (const name of ['loadCoreAdapters', 'loadClassAdapters', 'loadSpellsAdapters']) loaders[name].mockResolvedValue({});
});

test('attuning while loading shows canonical spell details without restarting the request or reloading', async () => {
  let finish;
  loaders.loadSpells.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  loaders.loadSpellsAdapters.mockRejectedValueOnce(new Error('Temporary chunk failure'));
  const { rerender } = render(view(character(false)));
  rerender(view(character(true)));
  expect(screen.getByRole('status')).toHaveTextContent('Loading spell details');
  expect(screen.queryByText('levitate', { exact: true })).not.toBeInTheDocument();
  expect(loaders.loadSpells).toHaveBeenCalledOnce();
  expect(loaders.loadClassAdapters).toHaveBeenCalledOnce();

  await act(async () => finish(catalog));
  fireEvent.click(await screen.findByText('Levitate', { exact: true }));
  expect(await screen.findByText('The target rises into the air.')).toBeVisible();
  expect(screen.queryByText(/no description/i)).not.toBeInTheDocument();
  // An adapter failure must not discard the catalog or show an error panel.
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  expect(screen.getByText('Levitate', { exact: true })).toBeInTheDocument();
});

test('an incomplete catalog retries silently and keeps available spell details visible', async () => {
  const partial = { ...catalog, failedFiles: ['spells-frhof.json'] };
  loaders.loadSpells.mockResolvedValue(partial);
  render(view(character(true)));
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect(loaders.loadSpells).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('levitate', { exact: true })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByText('Levitate', { exact: true }));
  expect(await screen.findByText('The target rises into the air.')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
});
