import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import EncounterImportDialog from '../../../../../src/pages/vtt/tokens/EncounterImportDialog.jsx';

const mocks = vi.hoisted(() => ({
  persisted: null,
  persistedById: {},
  listeners: new Set(),
  cloud: {
    listToolInstances: null,
    pullInstance: null,
    refreshInstance: null,
  },
}));

const LOCAL_ROW = {
  id: 'enc_a', name: 'Session 4', updatedAt: 10, origin: 'local', hasLocal: true, cloudState: 'local-only',
};

vi.mock('../../../../../src/pages/encounterbuilder/state/storage.js', () => ({
  readPersistedInstance: (id) => mocks.persistedById[id] ?? mocks.persisted,
}));
vi.mock('../../../../../src/shared/instances/instanceStore.js', () => ({
  CLOUD_STATES: { LOCAL: 'local-only', LINKED: 'linked', CONFLICT: 'conflict' },
  listInstances: () => [{ id: 'enc_a', name: 'Session 4', updatedAt: 10, cloud: 'local-only' }],
  subscribeInstanceData: (_sectionKey, _id, listener) => {
    mocks.listeners.add(listener);
    return () => mocks.listeners.delete(listener);
  },
}));
vi.mock('../../../../../src/shared/instances/instanceSync.js', () => ({
  listToolInstances: (...args) => mocks.cloud.listToolInstances(...args),
  pullInstance: (...args) => mocks.cloud.pullInstance(...args),
  refreshInstance: (...args) => mocks.cloud.refreshInstance(...args),
}));

// The bestiary and the snapshot restore are someone else's tests: what is under
// examination here is which encounters the dialog offers.
vi.mock('../../../../../src/pages/encounterbuilder/bestiary/useMonsterDb.js', () => ({
  useMonsterDb: () => ({ monsters: [], status: 'ready' }),
}));
vi.mock('../../../../../src/pages/encounterbuilder/combat/combat.js', () => ({
  restoreFight: (entry) => entry.fight,
  buildCombat: (encounter) => ({
    combatants: (encounter || []).map((item, index) => ({ id: index, name: item.name })),
  }),
}));
vi.mock('../../../../../src/pages/encounterbuilder/bestiary/monsterUtils.js', () => ({
  hydrateEncounterItems: (items) => items || [],
}));
vi.mock('../../../../../src/shared/vtt/tokens/encounterImport.js', () => ({
  importableCombatants: (fight) => fight?.combatants || [],
  combatantToToken: (combatant) => ({ ...combatant, image_url: null }),
}));
vi.mock('../../../../../src/pages/vtt/tokens/PiecePreview.jsx', () => ({
  default: () => null,
  beginPiecePointerDrag: () => {},
}));

const fight = (id, encounterId, name, savedAt) => ({
  id,
  encounterId,
  name,
  savedAt,
  fight: { combatants: [{ id: 0, name: 'Wolf' }] },
});

beforeEach(() => {
  mocks.persistedById = {};
  mocks.cloud.listToolInstances = vi.fn().mockResolvedValue({ rows: [LOCAL_ROW], error: null });
  mocks.cloud.pullInstance = vi.fn().mockResolvedValue({});
  mocks.cloud.refreshInstance = vi.fn().mockResolvedValue('local');
  mocks.persisted = {
    library: [
      { id: 'e1', name: 'Wolves', quest: 'The Long Winter', updatedAt: 20, encounter: [{ name: 'Wolf', qty: 5 }] },
      { id: 'e2', name: 'Bandits', quest: 'Debts Unpaid', updatedAt: 10, encounter: [{ name: 'Bandit', qty: 3 }] },
      { id: 'e3', name: 'Loose ends', updatedAt: 5, encounter: [{ name: 'Rat', qty: 1 }] },
    ],
    fightsData: {
      activeFightId: null,
      items: [
        fight('f3', 'e1', 'Wolves', 30),
        fight('f1', 'e1', 'Wolves', 10),
        fight('f2', 'e2', 'Bandits', 20),
        fight('f4', 'e3', 'Loose ends', 15),
      ],
    },
  };
});

const openEncounterMenu = async (user) => {
  await user.click(screen.getByRole('combobox', { name: 'Encounter' }));
  return screen.getByRole('listbox');
};

const props = { open: true, onClose: () => {}, onImport: () => {}, busy: false };

// The report this exists for: one encounter named "Wolves" in the builder, and
// three of them in this dialog — the fights of earlier launches, kept alive by
// their cloud rows.
test('an encounter launched again is offered once, not once per launch', async () => {
  const user = userEvent.setup();
  render(<EncounterImportDialog {...props} />);

  const options = within(await openEncounterMenu(user)).getAllByRole('option');
  expect(options.map((option) => option.textContent)).toEqual(['Wolves', 'Bandits', 'Loose ends']);
});

// The report this exists for: an encounter changed and saved again in the
// builder still placed its old creatures, under its new name — the fight of the
// earlier launch was imported instead of the card.
test('an encounter saved again since its fight was launched imports the new version', async () => {
  const launchedAt = Date.parse('2026-09-29T20:00:00Z');
  mocks.persisted = {
    library: [{
      id: 'e1',
      name: 'Wolves and their master',
      updatedAt: '2026-09-30T10:00:00Z',
      encounter: [{ name: 'Wolf', qty: 2 }, { name: 'Ogre', qty: 1 }],
    }],
    fightsData: { activeFightId: null, items: [fight(launchedAt, 'e1', 'Wolves', launchedAt)] },
  };
  const onImport = vi.fn();
  const user = userEvent.setup();
  render(<EncounterImportDialog {...props} onImport={onImport} />);

  expect(screen.getByText('2 creatures to place')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Place them' }));
  expect(onImport).toHaveBeenCalledWith(
    [{ id: 0, name: 'Wolf' }, { id: 1, name: 'Ogre' }],
    expect.objectContaining({ fightId: null, encounterId: 'e1' }),
  );
});

test('the quest narrows the encounters on offer', async () => {
  const user = userEvent.setup();
  render(<EncounterImportDialog {...props} />);

  await user.click(screen.getByRole('combobox', { name: 'Quest' }));
  const quests = within(screen.getByRole('listbox')).getAllByRole('option');
  expect(quests.map((option) => option.textContent))
    .toEqual(['All quests', 'Debts Unpaid', 'The Long Winter', 'No quest']);

  await user.click(screen.getByRole('option', { name: 'The Long Winter' }));
  expect(screen.getByRole('combobox', { name: 'Encounter' })).toHaveTextContent('Wolves');

  const options = within(await openEncounterMenu(user)).getAllByRole('option');
  expect(options.map((option) => option.textContent)).toEqual(['Wolves']);
});

// An encounter saved with no quest is still an encounter to import: it is
// gathered under its own option rather than being filtered out of existence.
test('the encounters with no quest have an option of their own', async () => {
  const user = userEvent.setup();
  render(<EncounterImportDialog {...props} />);

  await user.click(screen.getByRole('combobox', { name: 'Quest' }));
  await user.click(screen.getByRole('option', { name: 'No quest' }));

  const options = within(await openEncounterMenu(user)).getAllByRole('option');
  expect(options.map((option) => option.textContent)).toEqual(['Loose ends']);
});

// A save with nothing in it: no quest filter to show, and a reason rather than
// an empty menu.
test('a save with no encounter says so instead of offering an empty list', () => {
  mocks.persisted = { library: [], fightsData: { activeFightId: null, items: [] } };
  render(<EncounterImportDialog {...props} />);

  expect(screen.queryByRole('combobox', { name: 'Quest' })).toBeNull();
  expect(screen.getByText('This save has no encounter to import yet.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Place them' })).toBeDisabled();
});

// An encounter saved and never launched used to be missing from this list
// entirely, and the GM had to open the builder, launch it, and come back.
test('an encounter that was never launched is offered too, and is launched by placing it', async () => {
  const user = userEvent.setup();
  mocks.persisted = {
    library: [{ id: 'e9', name: 'Ambush', quest: 'The Long Winter', updatedAt: 40, encounter: [{ name: 'Wolf', qty: 2 }] }],
    fightsData: { activeFightId: null, items: [] },
  };
  const onImport = vi.fn();
  render(<EncounterImportDialog {...props} onImport={onImport} />);

  expect(screen.getByRole('combobox', { name: 'Encounter' })).toHaveTextContent('Ambush');
  expect(screen.getByText('Never launched: placing it starts its fight in the Encounter Builder.'))
    .toBeInTheDocument();

  // Reading down the list writes nothing: the encounter travels as itself, and
  // what places it does the launching.
  await user.click(screen.getByRole('button', { name: 'Place them' }));
  expect(onImport).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ name: 'Wolf' })]),
    expect.objectContaining({ instanceId: 'enc_a', encounterId: 'e9', fightId: null }),
  );
});

// The fight is what the pieces already on other screens point at, so an
// encounter that has one is imported from it rather than launched again.
test('an encounter with a fight is imported from that fight', async () => {
  const user = userEvent.setup();
  const onImport = vi.fn();
  render(<EncounterImportDialog {...props} onImport={onImport} />);

  await user.click(screen.getByRole('button', { name: 'Place them' }));
  expect(onImport).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ instanceId: 'enc_a', encounterId: 'e1', fightId: 'f3' }),
  );
});

// Read once and held was the bug behind "it only shows the encounters I already
// launched": a map left open since before tonight's prep kept offering whatever
// the instance held when the tab was first opened.
test('an encounter saved while the map was open turns up without a reload', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<EncounterImportDialog {...props} open={false} />);
  rerender(<EncounterImportDialog {...props} />);

  mocks.persisted = {
    ...mocks.persisted,
    library: [
      ...mocks.persisted.library,
      { id: 'e4', name: 'Owlbear', quest: 'The Long Winter', updatedAt: 50, encounter: [{ name: 'Owlbear', qty: 1 }] },
    ],
  };
  // The builder in this tab saved: the instance store announces it.
  act(() => { for (const listener of mocks.listeners) listener({ sectionKey: 'encounters', id: 'enc_a', kind: 'data' }); });

  const options = within(await openEncounterMenu(user)).getAllByRole('option');
  expect(options.map((option) => option.textContent)).toContain('Owlbear');
});

// The report: encounters prepared on another machine were not on offer, because
// the dialog only listed this browser's saves.
test('a save made on another device is listed from the cloud and downloaded when picked', async () => {
  const user = userEvent.setup();
  let finishPull;
  mocks.cloud.listToolInstances.mockResolvedValue({
    rows: [
      LOCAL_ROW,
      { id: 'enc_b', name: 'Laptop prep', updatedAt: 99, origin: 'cloud', hasLocal: false, cloudState: 'linked' },
    ],
    error: null,
  });
  mocks.cloud.pullInstance.mockImplementation(() => new Promise((resolve) => { finishPull = resolve; }));
  render(<EncounterImportDialog {...props} />);

  await user.click(screen.getByRole('combobox', { name: 'Encounter builder' }));
  const saves = within(screen.getByRole('listbox')).getAllByRole('option');
  // Newest first, and the one not in this browser says so.
  expect(saves.map((option) => option.textContent)).toEqual(['Laptop prepCloud', 'Session 4']);
  await user.click(saves[0]);

  expect(mocks.cloud.pullInstance).toHaveBeenCalledWith('encounters', 'enc_b');
  expect(screen.getByText('Downloading from the cloud…')).toBeInTheDocument();

  mocks.persistedById.enc_b = {
    library: [{ id: 'x1', name: 'Hill giant', updatedAt: 1, encounter: [{ name: 'Hill Giant', qty: 1 }] }],
    fightsData: { activeFightId: null, items: [] },
  };
  // The store announces a pull to its data subscribers, which is how the dialog
  // learns there is a payload to read.
  await act(async () => {
    finishPull({});
    for (const listener of mocks.listeners) listener({ sectionKey: 'encounters', id: 'enc_b', kind: 'pulled' });
  });

  expect(screen.queryByText('Downloading from the cloud…')).toBeNull();
  expect(screen.getByRole('combobox', { name: 'Encounter' })).toHaveTextContent('Hill giant');
  // Downloaded, it is a save in this browser like any other.
  expect(screen.getByRole('combobox', { name: 'Encounter builder' })).not.toHaveTextContent('Cloud');
});

test('a local copy linked to the cloud is brought up to date, not downloaded again', async () => {
  mocks.cloud.listToolInstances.mockResolvedValue({
    rows: [{ ...LOCAL_ROW, origin: 'cloud', cloudState: 'linked' }],
    error: null,
  });
  render(<EncounterImportDialog {...props} />);
  await act(async () => {});
  expect(mocks.cloud.refreshInstance).toHaveBeenCalledWith('encounters', 'enc_a');
  expect(mocks.cloud.pullInstance).not.toHaveBeenCalled();
  expect(mocks.cloud.refreshInstance).toHaveBeenCalledTimes(1);
});

test('a local-only save is read as it is', async () => {
  render(<EncounterImportDialog {...props} />);
  await act(async () => {});
  expect(mocks.cloud.refreshInstance).not.toHaveBeenCalled();
  expect(mocks.cloud.pullInstance).not.toHaveBeenCalled();
});

test('without the cloud the saves in this browser are still offered', async () => {
  mocks.cloud.listToolInstances.mockResolvedValue({ rows: [LOCAL_ROW], error: 'offline' });
  render(<EncounterImportDialog {...props} />);
  expect(await screen.findByText(/could not reach the cloud/i)).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Encounter' })).toHaveTextContent('Wolves');
});

test('a failed download says so and can be tried again', async () => {
  const user = userEvent.setup();
  mocks.cloud.listToolInstances.mockResolvedValue({
    rows: [
      { id: 'enc_b', name: 'Laptop prep', updatedAt: 99, origin: 'cloud', hasLocal: false, cloudState: 'linked' },
      LOCAL_ROW,
    ],
    error: null,
  });
  mocks.cloud.pullInstance.mockRejectedValue(new Error('network'));
  render(<EncounterImportDialog {...props} />);
  await user.click(screen.getByRole('combobox', { name: 'Encounter builder' }));
  await user.click(screen.getByRole('option', { name: /Laptop prep/ }));
  expect(await screen.findByText('Could not download this save from the cloud.')).toBeInTheDocument();

  await user.click(screen.getByRole('combobox', { name: 'Encounter builder' }));
  await user.click(screen.getByRole('option', { name: /Session 4/ }));
  await user.click(screen.getByRole('combobox', { name: 'Encounter builder' }));
  await user.click(screen.getByRole('option', { name: /Laptop prep/ }));
  await act(async () => {});
  expect(mocks.cloud.pullInstance).toHaveBeenCalledTimes(2);
});

// The report: with nothing in this browser, the dialog said "no saves" and then
// the cloud's turned up under it.
test('while the cloud list is on its way, an empty browser is not reported as no saves', async () => {
  let answer;
  mocks.cloud.listToolInstances.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
  const store = await import('../../../../../src/shared/instances/instanceStore.js');
  const spy = vi.spyOn(store, 'listInstances').mockReturnValue([]);
  try {
    render(<EncounterImportDialog {...props} />);
    expect(screen.getByText('Loading your encounter saves…')).toBeInTheDocument();
    expect(screen.queryByText(/no encounter builder saves yet/i)).toBeNull();

    await act(async () => answer({
      rows: [{ id: 'enc_b', name: 'Laptop prep', updatedAt: 99, origin: 'cloud', hasLocal: false, cloudState: 'linked' }],
      error: null,
    }));
    expect(screen.queryByText('Loading your encounter saves…')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Encounter builder' })).toHaveTextContent('Laptop prep');
    expect(mocks.cloud.pullInstance).toHaveBeenCalledWith('encounters', 'enc_b');
  } finally {
    spy.mockRestore();
  }
});

test('an empty browser and an empty cloud say there is nothing yet', async () => {
  mocks.cloud.listToolInstances.mockResolvedValue({ rows: [], error: null });
  const store = await import('../../../../../src/shared/instances/instanceStore.js');
  const spy = vi.spyOn(store, 'listInstances').mockReturnValue([]);
  try {
    render(<EncounterImportDialog {...props} />);
    expect(await screen.findByText(/no encounter builder saves yet/i)).toBeInTheDocument();
  } finally {
    spy.mockRestore();
  }
});
