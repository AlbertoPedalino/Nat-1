import { useReducer, useRef } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { createInitialState, encounterReducer } from '../../../../../src/pages/encounterbuilder/state/reducer.js';
import { snapshotFight } from '../../../../../src/pages/encounterbuilder/combat/combat.js';
import { toFightEntry } from '../../../../../src/pages/encounterbuilder/library/fightRecord.js';
import { useCloudFights } from '../../../../../src/pages/encounterbuilder/sync/useCloudFights.js';
import { useMonsterVitalDispatch } from '../../../../../src/pages/encounterbuilder/sync/useMonsterVitalDispatch.js';

// A fake database: one fight row, the same base check the RPC performs, and a
// realtime feed that reaches every subscribed builder.
const db = vi.hoisted(() => ({
  row: null,
  subscribers: new Set(),
  commit: vi.fn(),
  save: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('../../../../../src/shared/cloud/api/encounterFights.js', () => ({
  FIGHT_UNAVAILABLE: 'FIGHT_UNAVAILABLE',
  listInstanceFights: (...args) => db.list(...args),
  saveInstanceFight: (...args) => db.save(...args),
  deleteInstanceFight: vi.fn(async () => {}),
  getInstanceFight: (...args) => db.get(...args),
  commitFightCombatantVitals: (...args) => db.commit(...args),
  subscribeInstanceFights: (_instanceId, onChange) => {
    db.subscribers.add(onChange);
    return () => db.subscribers.delete(onChange);
  },
}));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed' }),
}));
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({
  useToast: () => ({ notify: db.notify }),
}));

const clone = (value) => structuredClone(value);
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const SAVE_SETTLE_MS = 700; // past useCloudFights' 500 ms write debounce

function goblin(hpCurrent = 30) {
  return {
    id: 0, name: 'Goblin', type: 'monster', initiative: 12, initMod: 0,
    hpCurrent, hpMax: 30, tempHP: 0, maxHPBonus: 0, activeConditions: [], activeEffects: [], isDead: false,
  };
}

function initialState() {
  const combat = { fightId: 77, name: 'Fight', combatants: [goblin(), { ...goblin(), id: 1, name: 'Orc' }], currentTurn: 0, round: 1 };
  return {
    ...createInitialState(),
    combat,
    activeFightId: 77,
    fights: [{ id: 77, name: 'Fight', savedAt: 1, encounterId: null, fight: snapshotFight(combat) }],
  };
}

function serverRow(fight) {
  return { id: '77', instance_id: 'enc_a', name: 'Fight', encounter_id: null, encounter: null, fight, updated_at: '2026-09-24T10:00:00Z' };
}

function monsterOf(fight, id = 0) {
  return fight.combatants.find((combatant) => combatant.id === id);
}

// What commit_fight_combatant_vitals does: compare the base, apply the patch.
function applyOnServer(fightId, combatantId, { base, patch }) {
  const current = monsterOf(db.row.fight, Number(combatantId));
  const stale = Object.entries(base || {}).some(([key, value]) => (current[key] ?? null) !== (value ?? null));
  if (stale) return { applied: false, row: clone(db.row) };
  const combatants = db.row.fight.combatants.map((c) => (c.id === current.id ? { ...c, ...patch } : c));
  db.row = { ...db.row, fight: { ...db.row.fight, combatants } };
  return { applied: true, row: clone(db.row) };
}

async function broadcast() {
  await act(async () => {
    await Promise.all([...db.subscribers].map((onChange) => onChange()));
  });
}

function mount() {
  const api = { current: null };
  function Harness() {
    const [state, reduce] = useReducer(encounterReducer, undefined, initialState);
    const cloudRef = useRef(null);
    const monsters = useMonsterVitalDispatch({ state, reduce, cloudRef });
    cloudRef.current = useCloudFights({
      instanceId: 'enc_a',
      instanceSaved: true,
      fights: state.fights,
      library: state.library,
      activeFightId: state.activeFightId,
      dispatch: reduce,
      isVitalsBusy: monsters.isBusy,
    });
    api.current = { state, dispatch: monsters.dispatch };
    return null;
  }
  render(<Harness />);
  return api;
}

// Mounting uploads each local fight once (existing behaviour of useCloudFights);
// the counts below start after that.
async function ready(builders = 1) {
  await waitFor(() => expect(db.list).toHaveBeenCalledTimes(builders));
  await wait(SAVE_SETTLE_MS);
  db.save.mockClear();
}

const hpOf = (api, id = 0) => monsterOf(api.current.state.combat, id).hpCurrent;

beforeEach(() => {
  db.row = serverRow(snapshotFight(initialState().combat));
  db.subscribers.clear();
  db.list.mockReset().mockImplementation(async () => [toFightEntry(clone(db.row))]);
  db.get.mockReset().mockImplementation(async () => clone(db.row));
  db.save.mockReset().mockResolvedValue(null);
  db.commit.mockReset().mockImplementation(async (...args) => applyOnServer(...args));
  db.notify.mockReset();
});

test('an enemy HP change is one authoritative write on the fight and nothing else', async () => {
  const api = mount();
  await ready();
  act(() => api.current.dispatch({ type: 'modifyHp', id: 0, delta: -5 }));
  expect(hpOf(api)).toBe(25);
  await waitFor(() => expect(db.commit).toHaveBeenCalledTimes(1));
  const [fightId, combatantId, { base, patch }] = db.commit.mock.calls[0];
  expect([fightId, combatantId]).toEqual(['77', 0]);
  expect(base).toMatchObject({ hpCurrent: 30, hpMax: 30 });
  expect(patch).toEqual({ hpCurrent: 25 });

  // The echo arriving over realtime changes nothing and triggers no save.
  await broadcast();
  await broadcast();
  await wait(SAVE_SETTLE_MS);
  expect(hpOf(api)).toBe(25);
  expect(db.commit).toHaveBeenCalledTimes(1);
  expect(db.save).not.toHaveBeenCalled();
});

test('a change made elsewhere (the battle map) updates the builder with zero writes', async () => {
  const api = mount();
  await ready();
  applyOnServer('77', '0', { patch: { hpCurrent: 18, activeConditions: ['prone'] } });
  await broadcast();
  expect(hpOf(api)).toBe(18);
  expect(monsterOf(api.current.state.combat).activeConditions).toEqual(['prone']);
  const settled = api.current.state;
  await broadcast(); // an identical event
  expect(api.current.state).toBe(settled);
  await wait(SAVE_SETTLE_MS);
  expect(db.commit).not.toHaveBeenCalled();
  expect(db.save).not.toHaveBeenCalled();
});

test('an identical edit sends nothing', async () => {
  const api = mount();
  await ready();
  act(() => api.current.dispatch({ type: 'setHp', id: 0, value: 30 }));
  await wait(SAVE_SETTLE_MS);
  expect(db.commit).not.toHaveBeenCalled();
  expect(db.save).not.toHaveBeenCalled();
});

test('a conflict is not retried: the builder takes the stored value and stops', async () => {
  const api = mount();
  await ready();
  applyOnServer('77', '0', { patch: { hpCurrent: 10 } }); // the map wrote first
  act(() => api.current.dispatch({ type: 'modifyHp', id: 0, delta: -5 }));
  await waitFor(() => expect(hpOf(api)).toBe(10));
  expect(db.commit).toHaveBeenCalledTimes(1);
  expect(db.notify).toHaveBeenCalledWith('warning', expect.any(String));
  await wait(SAVE_SETTLE_MS);
  expect(db.save).not.toHaveBeenCalled();
});

test('a failed or timed-out command reads the fight once and realigns', async () => {
  const api = mount();
  await ready();
  db.commit.mockRejectedValueOnce(Object.assign(new Error('timed out'), { code: 'FIGHT_TIMEOUT' }));
  act(() => api.current.dispatch({ type: 'modifyHp', id: 0, delta: -5 }));
  expect(hpOf(api)).toBe(25);
  await waitFor(() => expect(hpOf(api)).toBe(30));
  expect(db.commit).toHaveBeenCalledTimes(1);
  expect(db.get).toHaveBeenCalledTimes(1);
  await wait(SAVE_SETTLE_MS);
  expect(db.save).not.toHaveBeenCalled();
});

test('rapid clicks are sent in order, each from the previous value', async () => {
  const api = mount();
  await ready();
  act(() => {
    api.current.dispatch({ type: 'modifyHp', id: 0, delta: -5 });
    api.current.dispatch({ type: 'modifyHp', id: 0, delta: -5 });
  });
  await waitFor(() => expect(db.commit).toHaveBeenCalledTimes(2));
  expect(db.commit.mock.calls.map((call) => call[2].base.hpCurrent)).toEqual([30, 25]);
  await waitFor(() => expect(monsterOf(db.row.fight).hpCurrent).toBe(20));
  expect(hpOf(api)).toBe(20);
});

test('a pending fight save cannot restore enemy HP older than a newer remote value', async () => {
  const api = mount();
  await ready();
  act(() => api.current.dispatch({ type: 'nextTurn' })); // schedules a structural save
  applyOnServer('77', '0', { patch: { hpCurrent: 12 } });
  await broadcast();
  await wait(SAVE_SETTLE_MS);
  expect(db.save).toHaveBeenCalledTimes(1);
  const saved = db.save.mock.calls[0][1];
  expect(monsterOf(saved.fight).hpCurrent).toBe(12);
  expect(saved.fight.currentTurn).toBe(1);
});

test('without a cloud row the local edit stands and the ordinary fight save stores it', async () => {
  const api = mount();
  await ready();
  db.commit.mockRejectedValueOnce(Object.assign(new Error('Fight unavailable'), { code: 'FIGHT_UNAVAILABLE' }));
  act(() => api.current.dispatch({ type: 'modifyHp', id: 0, delta: -5 }));
  await waitFor(() => expect(db.save).toHaveBeenCalledTimes(1), { timeout: 2000 });
  expect(monsterOf(db.save.mock.calls[0][1].fight).hpCurrent).toBe(25);
  expect(hpOf(api)).toBe(25);
});

test('two builders editing at once converge without ping-pong', async () => {
  const a = mount();
  const b = mount();
  await ready(2);
  act(() => {
    a.current.dispatch({ type: 'modifyHp', id: 0, delta: -5 });
    b.current.dispatch({ type: 'modifyHp', id: 0, delta: -3 });
  });
  await waitFor(() => expect(db.commit).toHaveBeenCalledTimes(2));
  await broadcast();
  await waitFor(() => {
    expect(hpOf(a)).toBe(monsterOf(db.row.fight).hpCurrent);
    expect(hpOf(b)).toBe(monsterOf(db.row.fight).hpCurrent);
  });
  const stored = monsterOf(db.row.fight).hpCurrent;
  expect([25, 27]).toContain(stored);
  // Quiet afterwards: no writes without input.
  await broadcast();
  await wait(SAVE_SETTLE_MS);
  expect(db.commit).toHaveBeenCalledTimes(2);
  expect(db.save).not.toHaveBeenCalled();
  expect(hpOf(a)).toBe(stored);
  expect(hpOf(b)).toBe(stored);
});
