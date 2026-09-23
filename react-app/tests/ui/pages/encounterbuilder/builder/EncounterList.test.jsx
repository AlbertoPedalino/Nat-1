import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { EncounterBuilderProvider, useEncounterBuilder } from '../../../../../src/pages/encounterbuilder/state/EncounterBuilderContext.jsx';
import EncounterList from '../../../../../src/pages/encounterbuilder/builder/EncounterList.jsx';
import LibraryView from '../../../../../src/pages/encounterbuilder/library/LibraryView.jsx';
import { readPersistedInstance } from '../../../../../src/pages/encounterbuilder/state/storage.js';

vi.mock('../../../../../src/pages/encounterbuilder/bestiary/useMonsterDb.js', () => {
  const monsters = [{ name: 'Goblin', source: 'MM', cr: '1/4' }];
  return { useMonsterDb: () => ({ monsters, status: 'ready' }) };
});
vi.mock('../../../../../src/pages/encounterbuilder/campaign/useCampaignPlayers.js', () => ({ useCampaignPlayers: () => ({ campaigns: [] }) }));
vi.mock('../../../../../src/pages/encounterbuilder/campaign/useFightSheetSync.js', () => ({ useFightSheetSync: () => ({}) }));
vi.mock('../../../../../src/pages/encounterbuilder/campaign/useSheetRealtime.js', () => ({ useSheetRealtime: () => {} }));
vi.mock('../../../../../src/pages/encounterbuilder/sync/useExternalFightSync.js', () => ({ useExternalFightSync: () => {} }));
vi.mock('../../../../../src/pages/encounterbuilder/sync/useMapTokenBridge.js', () => ({ useMapTokenBridge: () => {} }));
vi.mock('../../../../../src/pages/encounterbuilder/sync/useCloudFights.js', () => ({ useCloudFights: () => {} }));
vi.mock('../../../../../src/pages/encounterbuilder/rolls/useEncounterRolls.js', () => ({ useEncounterRolls: () => ({}) }));
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: vi.fn() }) }));

const original = {
  id: 7, name: 'Road ambush', quest: 'Old Road', createdAt: '2025-01-01T00:00:00.000Z',
  encounter: [{ id: 'goblin', name: 'Goblin', source: 'MM', qty: 1 }],
};

function Harness() {
  const { state, dispatch } = useEncounterBuilder();
  return (
    <>
      <button onClick={() => {
        dispatch({ type: 'hydrateStorage', payload: { library: [original] }, monsters: [] });
        dispatch({ type: 'setView', view: 'library' });
      }}>Open saved library</button>
      <button onClick={() => dispatch({ type: 'setView', view: 'library' })}>Show library</button>
      <button onClick={() => dispatch({ type: 'setView', view: 'builder' })}>Back to builder</button>
      <button onClick={() => dispatch({ type: 'addMonster', monster: { name: 'Ogre', source: 'MM', cr: '2' } })}>Add Ogre</button>
      <output data-testid="state">{JSON.stringify(state)}</output>
      {state.view === 'library' ? <LibraryView /> : <EncounterList />}
    </>
  );
}

beforeEach(() => localStorage.clear());

test('Library updates stay on the same entry, while Launch saves and starts a new copy each time', async () => {
  const user = userEvent.setup();
  render(<EncounterBuilderProvider instanceId="test" instanceSaved><Harness /></EncounterBuilderProvider>);
  await user.click(screen.getByRole('button', { name: 'Open saved library' }));
  await user.click(screen.getByRole('button', { name: 'Load' }));
  await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Library name' }), { target: { value: 'Larger ambush' } });
  await user.click(screen.getByRole('button', { name: 'Update in Library' }));
  const readState = () => JSON.parse(screen.getByTestId('state').textContent);
  expect(readState().library).toHaveLength(1);
  expect(readState().library[0]).toMatchObject({ id: 7, name: 'Larger ambush', createdAt: original.createdAt });
  expect(readState().library[0].encounter[0].qty).toBe(2);
  expect(screen.getByRole('textbox', { name: 'Library name' })).toHaveValue('Larger ambush');
  await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
  await user.click(screen.getByRole('button', { name: 'Update in Library' }));
  expect(readState().library).toHaveLength(1);
  expect(readState().library[0].encounter[0].qty).toBe(3);
  expect(screen.queryByRole('button', { name: 'Save as New' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
  await user.click(screen.getByRole('button', { name: 'Launch' }));
  const copied = readState();
  expect(copied.library).toHaveLength(2);
  expect(copied.currentEncounterId).not.toBe(7);
  expect(copied.library[1].id).toBe(7);
  expect(copied.library[1].encounter[0].qty).toBe(3);
  expect(copied.library[0].encounter[0].qty).toBe(4);
  expect(copied.view).toBe('combat');
  expect(copied.combat.encounterId).toBe(copied.currentEncounterId);
  expect(readPersistedInstance('test').library).toEqual(copied.library);

  await user.click(screen.getByRole('button', { name: 'Back to builder' }));
  await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
  await user.click(screen.getByRole('button', { name: 'Launch' }));
  const relaunched = readState();
  expect(relaunched.library).toHaveLength(3);
  expect(relaunched.library[0].encounter[0].qty).toBe(5);
  expect(relaunched.library.slice(1)).toEqual(copied.library);
  expect(relaunched.fights).toHaveLength(2);
  expect(relaunched.combat.encounterId).toBe(relaunched.library[0].id);
  const persisted = readPersistedInstance('test');
  expect(persisted.library).toEqual(relaunched.library);
  expect(persisted.fightsData.items).toEqual(relaunched.fights);
  await user.click(screen.getByRole('button', { name: 'Show library' }));
  expect(screen.getAllByRole('button', { name: 'Load' })).toHaveLength(3);
});

test('New Encounter starts an empty draft after updating and saves it separately', async () => {
  const user = userEvent.setup();
  render(<EncounterBuilderProvider instanceId="test" instanceSaved><Harness /></EncounterBuilderProvider>);
  await user.click(screen.getByRole('button', { name: 'Open saved library' }));
  await user.click(screen.getByRole('button', { name: 'Load' }));
  await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
  await user.click(screen.getByRole('button', { name: 'Update in Library' }));
  const readState = () => JSON.parse(screen.getByTestId('state').textContent);
  const saved = readState();

  await user.click(screen.getByRole('button', { name: 'New Encounter' }));
  expect(screen.getByRole('textbox', { name: 'Library name' })).toHaveValue('');
  expect(screen.getByRole('combobox', { name: 'Quest category' })).toHaveValue('');
  expect(screen.getByText('Add monsters from the bestiary list.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save to Library' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Update in Library' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save as New' })).not.toBeInTheDocument();
  expect(readState().currentEncounterId).toBeNull();
  expect(readState().library).toEqual(saved.library);
  expect(readState().party).toEqual(saved.party);
  expect(readState().players).toEqual(saved.players);

  await user.click(screen.getByRole('button', { name: 'Add Ogre' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Library name' }), { target: { value: 'Ogre patrol' } });
  await user.click(screen.getByRole('button', { name: 'Save to Library' }));
  const next = readState();
  expect(next.library).toHaveLength(2);
  expect(next.library[1]).toEqual(saved.library[0]);
  expect(next.library[0]).toMatchObject({ name: 'Ogre patrol', quest: null });
  expect(next.library[0].id).not.toBe(original.id);
  expect(next.library[0].encounter.map((item) => item.name)).toEqual(['Ogre']);
});
