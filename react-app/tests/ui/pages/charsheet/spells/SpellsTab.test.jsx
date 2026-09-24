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

test('item references select their printing and keep same-name class spells separate', async () => {
  const alternate = { ...catalog.spells[0], source: 'FRHoF', entries: ['The item-specific printing.'] };
  loaders.loadSpells.mockResolvedValue({ ...catalog, spellVersions: [...catalog.spells, alternate] });
  const C = character(true);
  C.selectedSpells = { 2: ['Levitate'] };
  C.inventory[0].attachedSpells = { daily: { 1: ['levitate|frhof'] } };
  const { rerender } = render(view(C));
  await waitFor(() => expect(screen.getAllByText('Levitate', { exact: true })).toHaveLength(2));
  screen.getAllByText('Levitate', { exact: true }).forEach((row) => fireEvent.click(row));
  expect(screen.queryByText('Description', { exact: true })).not.toBeInTheDocument();
  expect(await screen.findByText('The item-specific printing.')).toBeVisible();
  expect(screen.getByText('The target rises into the air.')).toBeVisible();
  rerender(view({ ...C, inventory: [{ ...C.inventory[0], attuned: false }] }));
  expect(screen.getAllByText('Levitate', { exact: true })).toHaveLength(1);
  expect(screen.queryByText('The item-specific printing.')).not.toBeInTheDocument();
  expect(loaders.loadSpells).toHaveBeenCalledOnce();
});

test('a missing explicit printing does not substitute a same-name spell or show an error panel', async () => {
  const C = character(true);
  C.inventory[0].attachedSpells = ['levitate|frhof'];
  render(view(C));
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect(screen.queryByText('Levitate', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('levitate', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('an item reference without a source uses the preferred catalog printing', async () => {
  const C = character(true);
  C.inventory[0].attachedSpells = ['levitate'];
  render(view(C));
  fireEvent.click(await screen.findByText('Levitate', { exact: true }));
  expect(await screen.findByText('The target rises into the air.')).toBeVisible();
});
