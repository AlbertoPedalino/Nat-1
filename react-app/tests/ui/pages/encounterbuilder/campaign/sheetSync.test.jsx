import { useReducer } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { encounterReducer, createInitialState } from '../../../../../src/pages/encounterbuilder/state/reducer.js';
import CharacterVitalBridge from '../../../../../src/pages/encounterbuilder/campaign/CharacterVitalBridge.jsx';
import { useCharacterVitalDispatch } from '../../../../../src/pages/encounterbuilder/campaign/useCharacterVitalDispatch.js';
import { publishCharacterRow } from '../../../../../src/shared/cloud/sync/characterRows.js';

const cloud = vi.hoisted(() => ({ command: vi.fn(), get: vi.fn(), notify: vi.fn(), receivers: new Set(), states: {} }));
vi.mock('../../../../../src/shared/cloud/api/cloudCharacters.js', () => ({ commandCharacterVitals: cloud.command, getCloudCharacter: cloud.get }));
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: cloud.notify }) }));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({ useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'owner' } }) }));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({ supabase: {
  channel: () => ({
    on(_type, _filter, fn) { this.receive = fn; cloud.receivers.add(fn); return this; },
    subscribe(fn) { fn('SUBSCRIBED'); return this; },
  }),
  removeChannel(channel) { cloud.receivers.delete(channel.receive); },
} }));
vi.mock('../../../../../src/pages/campaigns/sheetSummary.js', () => ({ summarizeCharacter: (data) => ({ ...data, maxHP: 30 }) }));
vi.mock('../../../../../src/pages/charsheet/state/sheetRuntimeAdapters.js', () => ({ ensureSheetRuntimeAdapters: async () => {} }));

const player = { id: 1, type: 'player', sourceId: 'character', name: 'Player', hpCurrent: 30, hpMax: 30, tempHP: 0, deathSaves: { s: 0, f: 0 }, activeConditions: [] };
const monster = { id: 2, type: 'monster', name: 'Ogre', hpCurrent: 40, hpMax: 40 };
const fight = { id: 'fight', encounterId: 'encounter', combatants: [player, monster], currentTurn: 0, round: 1 };
const row = (hp, revision) => ({ id: 'character', row_revision: revision, data: { currentHP: hp, tempHP: 0, maxHPBonus: 0, activeConditions: [], deathSaves: { success: 0, fail: 0 } } });
function Harness({ id }) {
  const [state, reduce] = useReducer(encounterReducer, { ...createInitialState(), activeFightId: 'fight',
    players: [{ sourceId: 'character', hpMax: 30, currentHP: 30 }], fights: [fight, { ...fight, id: 'second' }],
    combat: { ...fight, fightId: 'fight' },
  });
  const dispatch = useCharacterVitalDispatch(state.combat, reduce);
  cloud.states[id] = { state, dispatch };
  return <>
    <CharacterVitalBridge charId="character" dispatch={reduce} refreshKey={state.activeFightId} />
    <output data-testid={id}>{state.combat.combatants[0].hpCurrent}</output>
    <button onClick={() => dispatch({ type: 'modifyHp', id: 1, delta: -5 })}>{id} damage</button>
  </>;
}
async function receive(hp, revision) { await act(async () => { for (const fn of cloud.receivers) fn({ new: row(hp, revision) }); }); }
beforeEach(() => {
  cloud.receivers.clear(); cloud.states = {};
  cloud.command.mockReset().mockResolvedValue(undefined);
  cloud.get.mockReset().mockResolvedValue(row(20, 1));
  cloud.notify.mockReset();
});

test('mount reconciles saved HP and a user damage click sends the intent only', async () => {
  render(<Harness id="A" />);
  await waitFor(() => expect(screen.getByTestId('A')).toHaveTextContent('20'));
  expect(cloud.command).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('A damage'));
  expect(cloud.command).toHaveBeenCalledWith('character', expect.objectContaining({ type: 'modifyHp', delta: -5 }));
  expect(screen.getByTestId('A')).toHaveTextContent('20');
  await act(async () => publishCharacterRow(row(15, 2)));
  expect(screen.getByTestId('A')).toHaveTextContent('15');
});

test('two active builders consume one player row without publishing echoes', async () => {
  render(<><Harness id="A" /><Harness id="B" /></>);
  await waitFor(() => expect(screen.getByTestId('B')).toHaveTextContent('20'));
  await receive(12, 3);
  await receive(25, 2);
  for (const id of ['A', 'B']) {
    expect(screen.getByTestId(id)).toHaveTextContent('12');
    expect(cloud.states[id].state.fights.every((f) => f.combatants[0].hpCurrent === 12)).toBe(true);
    expect(cloud.states[id].state.players[0].currentHP).toBe(12);
  }
  expect(cloud.command).not.toHaveBeenCalled();
});

test('restoring a stale fight cannot restore player HP, but updates monsters and effects', async () => {
  render(<Harness id="A" />);
  await waitFor(() => expect(screen.getByTestId('A')).toHaveTextContent('20'));
  await receive(12, 2);
  act(() => cloud.states.A.dispatch({ type: 'syncExternalFight', entry: { ...fight, combatants: [player, { ...monster, hpCurrent: 18 }] }, monsters: [] }));
  expect(screen.getByTestId('A')).toHaveTextContent('12');
  expect(cloud.states.A.state.combat.combatants[1].hpCurrent).toBe(18);
  act(() => cloud.states.A.dispatch({ type: 'resumeFight', entry: fight, monsters: [] }));
  expect(screen.getByTestId('A')).toHaveTextContent('12');
  expect(cloud.command).not.toHaveBeenCalled();
});

test('reconnect refreshes all cached fights while the builder view is open', async () => {
  render(<Harness id="A" />);
  await waitFor(() => expect(screen.getByTestId('A')).toHaveTextContent('20'));
  act(() => cloud.states.A.dispatch({ type: 'setView', view: 'builder' }));
  cloud.get.mockResolvedValue(row(10, 2));
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => expect(screen.getByTestId('A')).toHaveTextContent('10'));
  expect(cloud.command).not.toHaveBeenCalled();
});

test('failed character commands leave confirmed health intact and report the error', async () => {
  cloud.command.mockRejectedValue(new Error('Offline'));
  render(<Harness id="A" />);
  await waitFor(() => expect(screen.getByTestId('A')).toHaveTextContent('20'));
  fireEvent.click(screen.getByText('A damage'));
  await waitFor(() => expect(cloud.notify).toHaveBeenCalledWith('error', expect.stringContaining('Offline')));
  expect(screen.getByTestId('A')).toHaveTextContent('20');
});

test('monsters still use the encounter reducer', async () => {
  render(<Harness id="A" />);
  await waitFor(() => expect(screen.getByTestId('A')).toHaveTextContent('20'));
  act(() => cloud.states.A.dispatch({ type: 'modifyHp', id: 2, delta: -5 }));
  expect(cloud.states.A.state.combat.combatants[1].hpCurrent).toBe(35);
  expect(cloud.command).not.toHaveBeenCalled();
});
