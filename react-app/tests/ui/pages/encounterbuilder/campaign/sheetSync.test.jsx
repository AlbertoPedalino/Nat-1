import { useReducer, useRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { encounterReducer, createInitialState } from '../../../../../src/pages/encounterbuilder/state/reducer.js';
import { useCharacterVitalSync } from '../../../../../src/pages/encounterbuilder/campaign/useCharacterVitalSync.js';
import { useCharacterVitalDispatch } from '../../../../../src/pages/encounterbuilder/campaign/useCharacterVitalDispatch.js';
import { publishCharacterVitals } from '../../../../../src/shared/cloud/sync/characterEvents.js';
import { healthCommandRoute } from '../../../../../src/shared/cloud/api/healthCommandRoute.js';

const cloud = vi.hoisted(() => ({
  command: vi.fn(), get: vi.fn(), sheets: vi.fn(), notify: vi.fn(), receivers: new Set(), filters: [], states: {},
}));
vi.mock('../../../../../src/shared/cloud/api/cloudCharacters.js', () => ({ commandCharacterVitals: cloud.command }));
vi.mock('../../../../../src/shared/cloud/api/characterDigests.js', async (original) => ({
  ...await original(),
  listCharacterDigests: (...args) => cloud.get(...args),
  readCharacterSheets: (...args) => cloud.sheets(...args),
}));
vi.mock('../../../../../src/shared/campaign/characterVitals.js', () => ({
  readBaseMaxHp: async (rows) => new Map(rows.map((row) => [row.id, 30])),
}));
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: cloud.notify }) }));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({ useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'owner' } }) }));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({ supabase: {
  channel: () => ({
    on(_type, filter, fn) { this.receive = fn; cloud.filters.push(filter); cloud.receivers.add(fn); return this; },
    subscribe(fn) { fn('SUBSCRIBED'); return this; },
  }),
  removeChannel(channel) { cloud.receivers.delete(channel.receive); },
} }));

const player = { id: 1, type: 'player', sourceId: 'character', name: 'Player', hpCurrent: 30, hpMax: 30, tempHP: 0, deathSaves: { s: 0, f: 0 }, activeConditions: [] };
const monster = { id: 2, type: 'monster', name: 'Ogre', hpCurrent: 40, hpMax: 40 };
const fight = { id: 'fight', encounterId: 'encounter', combatants: [player, monster], currentTurn: 0, round: 1 };
const vitals = (hp) => ({ currentHP: hp, tempHP: 0, maxHPBonus: 0, activeConditions: [], deathSaves: { success: 0, fail: 0 } });
// What a health command answers: vitals, the digest revision and basis.
const vitalsAnswer = (hp, revision) => ({
  applied: true, characterId: 'character', digestRevision: revision, hpBasis: 'basis-1', vitals: vitals(hp),
});
// The digest row the database keeps for it.
const digestRow = (hp, revision) => ({
  character_id: 'character', campaign_id: null, owner: 'owner', row_revision: revision,
  digest: { name: 'Player', ...vitals(hp), hpBasis: 'basis-1' },
});
const digest = (hp, revision) => ({
  characterId: 'character', campaignId: null, ownerId: 'owner', rowRevision: revision, source: 'server',
  name: 'Player', ownerUsername: null, className: null, classIconColor: null, portraitPath: null,
  ...vitals(hp), hpBasis: 'basis-1',
});
function VitalSync({ state, reduce, vitalsRef }) {
  vitalsRef.current = useCharacterVitalSync({ characterIds: ['character'], dispatch: reduce, activeFightId: state.activeFightId });
  return null;
}
function Harness({ id }) {
  const [state, reduce] = useReducer(encounterReducer, { ...createInitialState(), activeFightId: 'fight',
    players: [{ sourceId: 'character', hpMax: 30, currentHP: 30 }], fights: [fight, { ...fight, id: 'second' }],
    combat: { ...fight, fightId: 'fight' },
  });
  const vitalsRef = useRef(null);
  const dispatch = useCharacterVitalDispatch(state.combat, reduce, vitalsRef);
  cloud.states[id] = { state, dispatch };
  return <>
    <VitalSync state={state} reduce={reduce} vitalsRef={vitalsRef} />
    <output data-testid={id}>{state.combat.combatants[0].hpCurrent}</output>
    <button onClick={() => dispatch({ type: 'modifyHp', id: 1, delta: -5 })}>{id} damage</button>
  </>;
}
async function receive(hp, revision) {
  await act(async () => { for (const fn of cloud.receivers) fn({ eventType: 'UPDATE', new: digestRow(hp, revision) }); });
}
beforeEach(() => {
  cloud.receivers.clear(); cloud.filters = []; cloud.states = {};
  cloud.command.mockReset().mockResolvedValue(undefined);
  cloud.get.mockReset().mockResolvedValue([digest(20, 1)]);
  cloud.sheets.mockReset().mockResolvedValue([{ id: 'character', data: vitals(20) }]);
  cloud.notify.mockReset();
});

test('mount reconciles saved HP and a user damage click sends the intent only', async () => {
  render(<Harness id="A" />);
  await waitFor(() => expect(screen.getByTestId('A')).toHaveTextContent('20'));
  expect(cloud.command).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('A damage'));
  expect(cloud.command).toHaveBeenCalledWith('character', expect.objectContaining({ type: 'modifyHp', delta: -5 }), expect.anything());
  // The command starts from the digest the builder follows and its base max: no sheet read.
  const [[commandId, command, context]] = cloud.command.mock.calls;
  expect(healthCommandRoute(commandId, command, context)).toBe('digest');
  expect(context.base).toEqual({ hpBasis: 'basis-1', baseMax: 30 });
  expect(screen.getByTestId('A')).toHaveTextContent('20');
  await act(async () => publishCharacterVitals(vitalsAnswer(15, 2)));
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
  cloud.get.mockResolvedValue([digest(10, 2)]);
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

test('one digest channel for the linked players, and the full sheet read only once per max-HP basis', async () => {
  render(<Harness id="A" />);
  await waitFor(() => expect(screen.getByTestId('A')).toHaveTextContent('20'));
  expect(cloud.filters).toEqual([
    { event: '*', schema: 'public', table: 'character_digests', filter: 'character_id=in.(character)' },
  ]);
  await receive(14, 2);
  await receive(9, 3);
  expect(screen.getByTestId('A')).toHaveTextContent('9');
  expect(cloud.sheets).toHaveBeenCalledTimes(1);
  // A new basis (a level-up, a new item): that one sheet is read again.
  await act(async () => {
    for (const fn of cloud.receivers) fn({ eventType: 'UPDATE', new: { ...digestRow(9, 4), digest: { ...digestRow(9, 4).digest, hpBasis: 'basis-2' } } });
  });
  await waitFor(() => expect(cloud.sheets).toHaveBeenCalledTimes(2));
  expect(cloud.sheets).toHaveBeenLastCalledWith(['character']);
});
