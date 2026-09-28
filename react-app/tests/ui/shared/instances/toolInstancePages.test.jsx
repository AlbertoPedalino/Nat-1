import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import EncounterBuilderPage from '../../../../src/pages/encounterbuilder/EncounterBuilderPage.jsx';
import GmBoardPage from '../../../../src/pages/gmboard/GmBoardPage.jsx';
import DmScreenPage from '../../../../src/pages/dmscreen/DmScreenPage.jsx';
import { SECTION_REGISTRY } from '../../../../src/shared/instances/sectionRegistry.js';
import { getInstance, readInstancePayload } from '../../../../src/shared/instances/instanceStore.js';
import {
  configureInstanceSync,
  disposeInstanceSync,
  setInstanceSyncActive,
} from '../../../../src/shared/instances/instanceSync.js';
import * as encounterStorage from '../../../../src/pages/encounterbuilder/state/storage.js';
import { createInitialState as createEncounterState } from '../../../../src/pages/encounterbuilder/state/reducer.js';
import * as boardStorage from '../../../../src/pages/gmboard/state/storage.js';
import { createInitialState as createBoardState, extractCoreState } from '../../../../src/pages/gmboard/state/reducer.js';
import * as screenStorage from '../../../../src/pages/dmscreen/state/storage.js';

// The real tool pages, useToolInstance, persistence hooks, instance store and
// sync engine, over an in-memory Supabase. Only the heavy views inside each
// page (and their own cloud hooks) are stubbed out.

const mocks = vi.hoisted(() => ({
  auth: { cloudEnabled: true, status: 'authed', user: { id: 'user-1' } },
  notify: vi.fn(),
}));

vi.mock('../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: mocks.notify }) }));
vi.mock('../../../../src/shared/cloud/api/campaigns.js', () => ({ listMyCampaigns: async () => [] }));
vi.mock('../../../../src/shared/cloud/api/campaignTools.js', () => ({
  setCampaignToolGroup: vi.fn(), setCampaignDungeonEncounter: vi.fn(),
}));
vi.mock('../../../../src/shared/cloud/api/hexcrawl.js', () => ({
  readHexcrawlBoardCampaign: async () => null,
  linkHexcrawlBoardCampaign: vi.fn(),
  setCampaignHexcrawlBoard: vi.fn(),
}));
vi.mock('../../../../src/shared/hexcrawl/useCampaignClock.js', () => ({
  useCampaignClock: () => ({ active: false, clock: null, error: null, saveClock: vi.fn() }),
}));
vi.mock('../../../../src/app/navigation/AppTopBar.jsx', () => ({
  default: ({ children }) => <div>{children}</div>,
  APP_TOP_BAR_HEIGHT: 56,
}));

// Encounter Builder: its real persistence hook behind a minimal provider (the
// real one also loads the bestiary, campaign players and fight rows).
vi.mock('../../../../src/pages/encounterbuilder/state/EncounterBuilderContext.jsx', async () => {
  const React = await import('react');
  const { encounterReducer, createInitialState } = await import('../../../../src/pages/encounterbuilder/state/reducer.js');
  const { useEncounterPersistence } = await import('../../../../src/pages/encounterbuilder/state/useEncounterPersistence.js');
  const Context = React.createContext(null);
  function EncounterBuilderProvider({ instanceId, children }) {
    const [state, dispatch] = React.useReducer(encounterReducer, undefined, createInitialState);
    useEncounterPersistence({ instanceId, monsters: [], monsterStatus: 'ready', state, dispatch });
    const value = React.useMemo(() => ({ state, dispatch, roll: () => null }), [state]);
    return <Context.Provider value={value}><div data-testid="editor">{state.party?.count}</div>{children}</Context.Provider>;
  }
  return { EncounterBuilderProvider, useEncounterBuilder: () => React.useContext(Context) };
});
const { stub } = vi.hoisted(() => ({ stub: () => ({ default: () => null }) }));
vi.mock('../../../../src/pages/encounterbuilder/builder/BuilderView.jsx', stub);
vi.mock('../../../../src/pages/encounterbuilder/combat/CombatView.jsx', stub);
vi.mock('../../../../src/pages/encounterbuilder/library/LibraryView.jsx', stub);
vi.mock('../../../../src/pages/encounterbuilder/bestiary/StatBlockDialog.jsx', stub);
vi.mock('../../../../src/pages/encounterbuilder/rolls/RollSharingControls.jsx', stub);
vi.mock('../../../../src/pages/encounterbuilder/rolls/RollLogLauncher.jsx', stub);
vi.mock('../../../../src/pages/encounterbuilder/rolls/CriticalFumblesDialog.jsx', stub);
vi.mock('../../../../src/pages/encounterbuilder/negotiation/NegotiationDialog.jsx', stub);
vi.mock('../../../../src/pages/encounterbuilder/rolls/EncounterDiceToast.jsx', () => ({
  default: () => null, buildEncounterDiceToast: () => null,
}));
vi.mock('../../../../src/shared/character/dice/CustomRollDialog.jsx', stub);
vi.mock('../../../../src/pages/gmboard/hexcrawl/HexcrawlView.jsx', () => ({ default: () => <div data-testid="editor" /> }));
vi.mock('../../../../src/pages/gmboard/dungeon/DungeonView.jsx', stub);
vi.mock('../../../../src/pages/gmboard/quests/QuestView.jsx', stub);
vi.mock('../../../../src/pages/gmboard/tables/TablesView.jsx', stub);
vi.mock('../../../../src/pages/gmboard/ui/GuideView.jsx', stub);
vi.mock('../../../../src/pages/dmscreen/notes/NoteBoard.jsx', () => ({ default: () => <div data-testid="editor" /> }));

const SETTLE_MS = 80; // background syncs run on a 0 ms debounce here
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// What supabase/18_section_versions.sql does: the database owns `version`
// (0 on insert, +1 when data changes) and `updated_at`; client values are ignored.
function versioned(previous, next) {
  const now = new Date().toISOString();
  if (!previous) return { ...next, version: 0, updated_at: now };
  const dataChanged = JSON.stringify(next.data) !== JSON.stringify(previous.data);
  return {
    ...next,
    version: dataChanged ? previous.version + 1 : previous.version,
    updated_at: dataChanged ? now : previous.updated_at,
  };
}

// In-memory PostgREST: owner-scoped, unique ids, conditional updates, write log.
function fakeCloud(rows = {}) {
  const tables = new Map(Object.entries(rows).map(([table, list]) => [table, new Map(list.map((row) => [row.id, structuredClone(row)]))]));
  const writes = [];
  const reads = [];
  const table = (name) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  function run(query) {
    const store = table(query.table);
    const matches = () => [...store.values()].filter((row) => query.filters.every(([field, value]) => row[field] === value));
    if (query.op === 'insert') {
      writes.push({ table: query.table, op: 'insert', row: query.row });
      if (store.has(query.row.id)) return { data: null, error: { code: '23505', message: 'duplicate key value' } };
      store.set(query.row.id, versioned(null, structuredClone(query.row)));
      return { data: [structuredClone(store.get(query.row.id))], error: null };
    }
    if (query.op === 'update') {
      const found = matches();
      writes.push({ table: query.table, op: 'update', patch: query.patch });
      for (const row of found) store.set(row.id, versioned(row, { ...row, ...structuredClone(query.patch) }));
      return { data: found.map((row) => structuredClone(store.get(row.id))), error: null };
    }
    reads.push(query.table);
    return { data: matches().map((row) => structuredClone(row)), error: null };
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-1', user_metadata: {} } }, error: null }) },
    from(tableName) {
      const query = { table: tableName, op: 'select', filters: [] };
      const builder = {
        select() { return builder; },
        insert(row) { query.op = 'insert'; query.row = row; return builder; },
        update(patch) { query.op = 'update'; query.patch = patch; return builder; },
        eq(field, value) { query.filters.push([field, value]); return builder; },
        order() { return builder; },
        async maybeSingle() {
          const result = run(query);
          return { data: result.data?.[0] ?? null, error: result.error };
        },
        then(resolve, reject) { return Promise.resolve(run(query)).then(resolve, reject); },
      };
      return builder;
    },
  };
  return {
    client, writes, reads,
    row: (tableName, id) => structuredClone(table(tableName).get(id) || null),
    edit: (tableName, id, patch) => table(tableName).set(id, versioned(table(tableName).get(id), { ...table(tableName).get(id), ...patch })),
  };
}

// A cloud payload exactly as each tool writes it, captured through its own
// adapter (then storage is wiped again).
function captured(id, write) {
  localStorage.clear();
  write(id);
  const payload = Object.fromEntries(Object.keys(localStorage).filter((key) => key.includes(`:${id}:`)).map((key) => [key, localStorage.getItem(key)]));
  localStorage.clear();
  return payload;
}

const TOOLS = {
  encounters: {
    id: 'enc_boss',
    path: '/encounter-builder',
    Page: EncounterBuilderPage,
    payload: () => captured('enc_boss', (id) => encounterStorage.persistEncounter(id, {
      ...createEncounterState(),
      party: { count: 5, level: 7 },
      library: [encounterStorage.makeSavedEncounter('Boss', [], { count: 5, level: 7 })],
    })),
  },
  gmboard: {
    id: 'gm_boss',
    path: '/gmboard',
    Page: GmBoardPage,
    payload: () => captured('gm_boss', (id) => {
      const state = createBoardState();
      boardStorage.persistBoard(id, { state: extractCoreState(state), tables: state.tables, results: state.results });
    }),
  },
  dmscreen: {
    id: 'screen_boss',
    path: '/dm-screen',
    Page: DmScreenPage,
    payload: () => captured('screen_boss', (id) => screenStorage.persistNotes(id, [{ id: 'n1', title: 'Boss', body: 'HP 300' }])),
  },
};

let cloud;

function cloudRow(key, overrides = {}) {
  return {
    id: TOOLS[key].id, owner: 'user-1', name: 'Boss Fight', link_group_id: null,
    data: TOOLS[key].payload(), version: 3, updated_at: '2026-09-01T10:00:00.000Z', ...overrides,
  };
}

function useCloud(rows) {
  cloud = fakeCloud(rows);
  configureInstanceSync({ getClient: () => cloud.client, delay: 0 });
  setInstanceSyncActive(mocks.auth.status === 'authed');
}

function signIn(status) {
  mocks.auth.status = status;
  act(() => setInstanceSyncActive(status === 'authed'));
}

function page(key, url) {
  const { Page, path } = TOOLS[key];
  return (
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path={path} element={<Page />} /></Routes>
    </MemoryRouter>
  );
}

const urlOf = (key) => SECTION_REGISTRY[key].route(TOOLS[key].id);
const table = (key) => SECTION_REGISTRY[key].table;

beforeEach(() => {
  localStorage.clear();
  mocks.notify.mockReset();
  mocks.auth.cloudEnabled = true;
  mocks.auth.status = 'authed';
});

afterEach(() => {
  disposeInstanceSync();
  setInstanceSyncActive(false);
});

describe.each(Object.keys(TOOLS))('%s opened by URL in a browser without it', (key) => {
  test('pulls the cloud copy: its name and data, and writes nothing back', async () => {
    const row = cloudRow(key);
    useCloud({ [table(key)]: [row] });
    render(page(key, urlOf(key)));

    expect(await screen.findByTestId('editor')).toBeInTheDocument();
    await act(() => wait(SETTLE_MS));
    expect(getInstance(key, TOOLS[key].id)).toMatchObject({ name: 'Boss Fight', cloud: 'linked', version: 3 });
    expect(readInstancePayload(key, TOOLS[key].id)).toEqual(row.data);
    expect(cloud.writes).toEqual([]);
    expect(cloud.row(table(key), TOOLS[key].id)).toEqual(row);
  });

  test('creates it when the cloud has no such row, with a single INSERT', async () => {
    useCloud({});
    render(page(key, urlOf(key)));
    expect(await screen.findByTestId('editor')).toBeInTheDocument();
    await act(() => wait(SETTLE_MS));
    expect(cloud.writes.map((write) => write.op)).toEqual(['insert']);
    expect(getInstance(key, TOOLS[key].id).cloud).toBe('linked');
  });
});

test('while auth is loading nothing is created, read or written; once signed in the cloud copy is pulled', async () => {
  mocks.auth.status = 'loading';
  const row = cloudRow('encounters');
  useCloud({ encounters: [row] });
  const view = render(page('encounters', urlOf('encounters')));

  expect(screen.getByRole('status')).toHaveTextContent('Loading encounter');
  await act(() => wait(SETTLE_MS));
  expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
  expect(getInstance('encounters', 'enc_boss')).toBeNull();
  expect(cloud.reads).toEqual([]);
  expect(cloud.writes).toEqual([]);

  signIn('authed');
  view.rerender(page('encounters', urlOf('encounters')));
  expect(await screen.findByTestId('editor')).toHaveTextContent('5');
  await act(() => wait(SETTLE_MS));
  expect(getInstance('encounters', 'enc_boss').name).toBe('Boss Fight');
  expect(cloud.writes).toEqual([]);
});

test('a copy used while signed out meets the cloud row on sign-in as a conflict the user resolves', async () => {
  mocks.auth.status = 'anon';
  const row = cloudRow('encounters');
  useCloud({ encounters: [row] });
  const view = render(page('encounters', urlOf('encounters')));

  // Signed out, a local copy is usable at once.
  expect(await screen.findByTestId('editor')).toHaveTextContent('4');
  await act(() => wait(SETTLE_MS));
  expect(getInstance('encounters', 'enc_boss').cloud).toBe('local-only');

  signIn('authed');
  view.rerender(page('encounters', urlOf('encounters')));
  expect(await screen.findByRole('alert')).toHaveTextContent('already exists in the cloud');
  expect(cloud.row('encounters', 'enc_boss')).toEqual(row);
  expect(cloud.writes.filter((write) => write.op === 'update')).toEqual([]);

  fireEvent.click(screen.getByRole('button', { name: 'Use cloud copy' }));
  await waitFor(() => expect(screen.getByTestId('editor')).toHaveTextContent('5'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(getInstance('encounters', 'enc_boss')).toMatchObject({ name: 'Boss Fight', cloud: 'linked' });
  await act(() => wait(SETTLE_MS));
  expect(cloud.row('encounters', 'enc_boss')).toEqual(row);
});

test('a copy changed on both sides shows a conflict; keeping this copy writes it explicitly', async () => {
  const row = cloudRow('dmscreen');
  useCloud({ dm_screens: [row] });
  const first = render(page('dmscreen', urlOf('dmscreen')));
  await screen.findByTestId('editor');
  await act(() => wait(SETTLE_MS));
  first.unmount();

  // Another device moves the cloud on; this one edits its (older) copy.
  cloud.edit('dm_screens', 'screen_boss', { data: { ...row.data, 'gb:dmscreen:screen_boss:notes:v2': '{"version":2,"notes":[]}' } });
  signIn('anon');
  screenStorage.persistNotes('screen_boss', [{ id: 'mine', title: 'Mine', body: 'kept' }]);
  const mine = readInstancePayload('dmscreen', 'screen_boss');

  signIn('authed');
  render(page('dmscreen', urlOf('dmscreen')));
  expect(await screen.findByRole('alert')).toHaveTextContent('changed in the cloud');
  expect(cloud.row('dm_screens', 'screen_boss').version).toBe(4);

  fireEvent.click(screen.getByRole('button', { name: 'Keep this copy' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(cloud.row('dm_screens', 'screen_boss').data).toEqual(mine);
});

test('an instance opened from the Links menu in a new tab pulls its cloud copy first', async () => {
  useCloud({
    boards: [cloudRow('gmboard', { name: 'Board A', link_group_id: 'link_party' })],
    encounters: [cloudRow('encounters', { link_group_id: 'link_party' })],
  });
  const boardTab = render(page('gmboard', urlOf('gmboard')));
  fireEvent.click(await screen.findByRole('button', { name: 'Linked tools' }));
  const open = await screen.findByRole('link', { name: 'Open Boss Fight' });
  expect(open).toHaveAttribute('target', '_blank');
  const href = open.getAttribute('href');
  expect(href).toBe(urlOf('encounters'));
  boardTab.unmount();

  // The new tab: same browser storage, a fresh page at that URL.
  cloud.writes.length = 0;
  render(page('encounters', href));
  expect(await screen.findByTestId('editor')).toHaveTextContent('5');
  await act(() => wait(SETTLE_MS));
  expect(getInstance('encounters', 'enc_boss')).toMatchObject({ name: 'Boss Fight', linkGroupId: 'link_party' });
  expect(cloud.writes.filter((write) => write.table === 'encounters')).toEqual([]);
});

test('?<tool>=new creates one instance and replaces the URL with its id', async () => {
  useCloud({});
  render(page('gmboard', '/gmboard?board=new&linkGroup=link_party'));
  await screen.findByTestId('editor');
  await act(() => wait(SETTLE_MS));
  const boards = JSON.parse(localStorage.getItem('gb_board_registry'));
  expect(boards).toHaveLength(1);
  expect(boards[0]).toMatchObject({ linkGroupId: 'link_party', cloud: 'linked' });
  expect(cloud.writes.map((write) => write.op)).toEqual(['insert']);
});
