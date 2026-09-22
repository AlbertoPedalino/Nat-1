import { act, renderHook } from '@testing-library/react';
import { useReducer } from 'react';
import { useFightSheetSync } from '../../../../../src/pages/encounterbuilder/campaign/useFightSheetSync.js';
import { useSheetRealtime } from '../../../../../src/pages/encounterbuilder/campaign/useSheetRealtime.js';
import { encounterReducer, createInitialState } from '../../../../../src/pages/encounterbuilder/state/reducer.js';
import { useEncounterPersistence } from '../../../../../src/pages/encounterbuilder/state/useEncounterPersistence.js';
import { useExternalFightSync } from '../../../../../src/pages/encounterbuilder/sync/useExternalFightSync.js';
import { persistFights, readPersistedInstance, registerEncounterInstance } from '../../../../../src/pages/encounterbuilder/state/storage.js';

const cloud = vi.hoisted(() => ({ patch: vi.fn(), receive: null }));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'gm' } }),
}));
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: vi.fn() }) }));
vi.mock('../../../../../src/shared/cloud/api/cloudCharacters.js', () => ({ patchCharacterData: cloud.patch }));
vi.mock('../../../../../src/pages/campaigns/sheetSummary.js', () => ({ summarizeCharacter: (data) => data }));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: () => ({ on(_event, _filter, receive) { cloud.receive = receive; return this; }, subscribe() {} }),
    removeChannel: vi.fn(),
  },
}));

const monsters = [];

function openCombat({ saved = false } = {}) {
  const initial = encounterReducer(createInitialState(), {
      type: 'resumeFight',
      entry: { id: 'fight', fight: { combatants: [{
        id: 'player', type: 'player', sourceId: 'character', name: 'Player', hpMax: 30,
        hpCurrent: 30, tempHP: 0, maxHPBonus: 0, activeConditions: [], deathSaves: { s: 0, f: 0 },
      }] } },
    });
  if (saved) {
    registerEncounterInstance('test', 'Test');
    persistFights('test', initial.activeFightId, initial.fights);
  }
  return renderHook(() => {
    const [state, dispatch] = useReducer(encounterReducer, initial);
    const sheetSync = useFightSheetSync(state.combat);
    useSheetRealtime({ view: state.view, combat: state.combat, dispatch, sheetSync });
    useEncounterPersistence({
      instanceId: 'test', instanceSaved: saved, monsters, monsterStatus: 'ready', state, dispatch,
    });
    useExternalFightSync({
      instanceId: 'test', instanceSaved: saved, activeFightId: state.activeFightId,
      fights: state.fights, library: state.library, monsters, dispatch,
    });
    return { state, dispatch };
  });
}

function receive(currentHP, seconds = 1) {
  cloud.receive({ new: {
    id: 'character', updated_at: `2026-09-22T12:00:${String(seconds).padStart(2, '0')}.000Z`,
    data: { currentHP, maxHP: 30, maxHPBonus: 0, tempHP: 0, activeConditions: [], deathSaves: { success: 0, fail: 0 } },
  } });
}
async function flush() { await act(async () => { await vi.advanceTimersByTimeAsync(1000); }); }
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); cloud.patch.mockReset().mockResolvedValue(undefined); });
afterEach(() => { vi.useRealTimers(); });

test('player damage updates the encounter without writing it back to the sheet', async () => {
  const { result } = openCombat();
  act(() => receive(25));
  await flush();
  expect(result.current.state.combat.combatants[0].hpCurrent).toBe(25);
  expect(cloud.patch).not.toHaveBeenCalled();
});

test('returning to the synced HP cancels an older pending damage write', async () => {
  const { result } = openCombat();
  act(() => result.current.dispatch({ type: 'setHp', id: 'player', value: 25 }));
  act(() => result.current.dispatch({ type: 'setHp', id: 'player', value: 30 }));
  await flush();
  expect(cloud.patch).not.toHaveBeenCalled();
});

test('a delayed older player update cannot undo newer HP', async () => {
  const { result } = openCombat();
  act(() => receive(20, 2));
  act(() => receive(25, 1));
  await flush();
  expect(result.current.state.combat.combatants[0].hpCurrent).toBe(20);
  expect(cloud.patch).not.toHaveBeenCalled();
});

test('player changes do not make a delayed GM echo authoritative again', async () => {
  const { result } = openCombat();
  act(() => result.current.dispatch({ type: 'setHp', id: 'player', value: 25 }));
  await flush();
  act(() => receive(20, 2));
  act(() => receive(25, 1));
  expect(result.current.state.combat.combatants[0].hpCurrent).toBe(20);
});

test('an HP undo is sent after an already in-flight damage write', async () => {
  let finishWrite;
  cloud.patch.mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve; }));
  const { result } = openCombat();
  act(() => result.current.dispatch({ type: 'setHp', id: 'player', value: 25 }));
  await flush();
  act(() => result.current.dispatch({ type: 'setHp', id: 'player', value: 30 }));
  await act(async () => finishWrite());
  await flush();
  expect(cloud.patch).toHaveBeenCalledTimes(2);
  expect(cloud.patch).toHaveBeenLastCalledWith('character', expect.objectContaining({ currentHP: 30 }));
});

test('newer healing to a previous HP value is still accepted', async () => {
  const { result } = openCombat();
  act(() => receive(25, 1));
  act(() => receive(20, 2));
  act(() => receive(25, 3));
  await flush();
  expect(result.current.state.combat.combatants[0].hpCurrent).toBe(25);
  expect(cloud.patch).not.toHaveBeenCalled();
});

test('repeated player damage remains stable with encounter persistence and storage listeners active', async () => {
  const { result } = openCombat({ saved: true });
  for (let seconds = 1; seconds <= 10; seconds += 1) {
    const hp = 30 - seconds;
    act(() => receive(hp, seconds));
    await flush();
    expect(result.current.state.combat.combatants[0].hpCurrent).toBe(hp);
    expect(readPersistedInstance('test').fightsData.items[0].fight.combatants[0].hpCurrent).toBe(hp);
  }
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(result.current.state.combat.combatants[0].hpCurrent).toBe(20);
  expect(cloud.patch).not.toHaveBeenCalled();
});

test('a player update cancels queued GM damage even when storage restores the saved fight', async () => {
  const { result } = openCombat({ saved: true });
  act(() => result.current.dispatch({ type: 'setHp', id: 'player', value: 25 }));
  act(() => receive(20, 2));
  await flush();
  expect(result.current.state.combat.combatants[0].hpCurrent).toBe(20);
  expect(cloud.patch).not.toHaveBeenCalled();
});
