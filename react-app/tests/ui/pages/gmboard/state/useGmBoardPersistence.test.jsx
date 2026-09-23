import { act, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { GmBoardProvider, useGmBoard } from '../../../../../src/pages/gmboard/state/GmBoardContext.jsx';
import { createDefaultTables } from '../../../../../src/pages/gmboard/tables/defaultTables.js';
import {
  persistBoardResults,
  persistBoardState,
  persistBoardTables,
  readPersistedBoard,
  registerBoardInstance,
} from '../../../../../src/pages/gmboard/state/storage.js';

const campaignClock = vi.hoisted(() => ({
  active: false,
  clock: null,
  error: null,
  saveClock: vi.fn(),
  writes: vi.fn(),
  ids: vi.fn(),
  readLink: vi.fn(),
}));

vi.mock('../../../../../src/shared/hexcrawl/useCampaignClock.js', () => ({
  useCampaignClock: (id) => {
    campaignClock.ids(id);
    return { ...campaignClock };
  },
}));

vi.mock('../../../../../src/shared/cloud/api/hexcrawl.js', () => ({
  readHexcrawlBoardCampaign: campaignClock.readLink,
}));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed' }),
}));

let board;

function Probe() {
  board = useGmBoard();
  return null;
}

beforeEach(() => {
  localStorage.clear();
  campaignClock.active = false;
  campaignClock.clock = null;
  campaignClock.error = null;
  campaignClock.saveClock.mockReset();
  campaignClock.writes.mockReset();
  campaignClock.ids.mockReset();
  campaignClock.readLink.mockReset().mockResolvedValue(null);
  campaignClock.saveClock.mockImplementation(async (next) => {
    campaignClock.writes(typeof next === 'function' ? next(campaignClock.clock) : next);
    return null;
  });
});

test('table edits autosave locally and announce cloud sync', async () => {
  const tables = createDefaultTables();
  tables.weather[0] = { ...tables.weather[0], sole: 3 };
  registerBoardInstance('table-autosave', 'Table autosave');
  persistBoardState('table-autosave', readPersistedBoard('missing').state);
  persistBoardTables('table-autosave', tables);
  persistBoardResults('table-autosave', readPersistedBoard('missing').results);

  const onSaved = vi.fn();
  window.addEventListener('gb:board-saved', onSaved);
  render(
    <GmBoardProvider instanceId="table-autosave" instanceSaved>
      <Probe />
    </GmBoardProvider>,
  );

  await waitFor(() => expect(board.state.tables.weather[0].sole).toBe(3));
  onSaved.mockClear();

  act(() => board.dispatch({
    type: 'editTableCell',
    tableKey: 'weather',
    matchField: 's',
    matchValue: board.state.tables.weather[0].s,
    field: 'sole',
    value: 4,
  }));

  await waitFor(() => expect(readPersistedBoard('table-autosave').tables.weather[0].sole).toBe(4));
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({
    detail: { id: 'table-autosave' },
  }));
  window.removeEventListener('gb:board-saved', onSaved);
});

test('date and time persist locally on a standalone board', async () => {
  registerBoardInstance('clock-local', 'Local clock');
  persistBoardState('clock-local', readPersistedBoard('missing').state);

  render(
    <GmBoardProvider instanceId="clock-local" instanceSaved>
      <Probe />
    </GmBoardProvider>,
  );
  await waitFor(() => expect(board.state.year).toBe(1000));

  act(() => board.setStart({ day: 9, month: 8, year: 1492, min: 13 * 60 + 45 }));

  await waitFor(() => expect(readPersistedBoard('clock-local').state).toEqual(expect.objectContaining({
    day: 9,
    month: 8,
    year: 1492,
    min: 13 * 60 + 45,
  })));
  expect(campaignClock.saveClock).not.toHaveBeenCalled();
});

test('date and time also update the shared clock of a linked campaign', async () => {
  campaignClock.active = true;
  campaignClock.readLink.mockResolvedValue({ id: 'campaign-one', name: 'Campaign One' });
  registerBoardInstance('clock-linked', 'Linked clock');
  persistBoardState('clock-linked', {
    ...readPersistedBoard('missing').state,
    campaignId: 'stale-local-campaign',
    season: 'Summer',
  });

  render(
    <GmBoardProvider instanceId="clock-linked" instanceSaved>
      <Probe />
    </GmBoardProvider>,
  );
  await waitFor(() => expect(board.campaign?.id).toBe('campaign-one'));
  expect(campaignClock.ids).toHaveBeenLastCalledWith('campaign-one');
  expect(campaignClock.ids).not.toHaveBeenCalledWith('stale-local-campaign');

  act(() => board.setStart({ day: 3, month: 4, year: 1234, min: 7 * 60 + 30 }));

  await waitFor(() => expect(campaignClock.writes).toHaveBeenCalledWith(expect.objectContaining({
    day: 3,
    month: 4,
    year: 1234,
    min: 7 * 60 + 30,
    season: 'Summer',
  })));
  await waitFor(() => expect(readPersistedBoard('clock-linked').state.year).toBe(1234));

  act(() => board.setTime(22 * 60 + 5));
  await waitFor(() => expect(campaignClock.writes).toHaveBeenLastCalledWith(expect.objectContaining({
    day: 3,
    month: 4,
    year: 1234,
    min: 22 * 60 + 5,
  })));

  act(() => board.setSeason('Winter'));
  await waitFor(() => expect(campaignClock.writes).toHaveBeenLastCalledWith(expect.objectContaining({
    season: 'Winter',
    min: 22 * 60 + 5,
  })));

  act(() => board.setWeatherOverride({ meteo: 'Snow', intensity: 'Heavy' }));
  await waitFor(() => expect(campaignClock.writes).toHaveBeenLastCalledWith(expect.objectContaining({
    season: 'Winter',
    meteo: 'Snow',
    intensity: 'Heavy',
  })));
  campaignClock.readLink.mockResolvedValue(null);
  act(() => window.dispatchEvent(new Event('gb:campaign-board-link-changed')));
  await waitFor(() => expect(board.campaign).toBeNull());
  expect(campaignClock.ids).toHaveBeenLastCalledWith(undefined);
});

test('travel selectors publish only their changed field and receive map selections', async () => {
  campaignClock.active = true;
  campaignClock.clock = {
    travelConfigured: true, terrain: 'Forest', pop: 'frontier', hexTier: 2,
    mountSpeed: 2, season: 'Summer', updatedAt: 1,
  };
  const view = () => (
    <GmBoardProvider instanceId="travel-linked" instanceSaved={false}><Probe /></GmBoardProvider>
  );
  const { rerender } = render(view());
  await waitFor(() => expect(board.state).toMatchObject({
    terrain: 'Forest', terrainH: 4, pop: 'frontier', popThr: 2, hexTier: 2, mountSpeed: 2,
  }));
  act(() => board.dispatch({ type: 'setMountSpeed', mountSpeed: 3 }));
  expect(campaignClock.writes).toHaveBeenLastCalledWith({ mountSpeed: 3 });
  act(() => board.dispatch({ type: 'setTerrain', terrain: 'Road', terrainH: 1 }));
  expect(campaignClock.writes).toHaveBeenLastCalledWith({ terrain: 'Road' });
  act(() => board.dispatch({ type: 'setPop', pop: 'unexplored', popThr: 1 }));
  expect(campaignClock.writes).toHaveBeenLastCalledWith({ pop: 'unexplored' });
  act(() => board.dispatch({ type: 'setHexTier', hexTier: null }));
  expect(campaignClock.writes).toHaveBeenLastCalledWith({ hexTier: null });

  campaignClock.clock = { ...campaignClock.clock, terrain: null, hexTier: null, season: null, updatedAt: 2 };
  rerender(view());
  await waitFor(() => expect(board.state).toMatchObject({ terrain: null, terrainH: 0, hexTier: null, season: null }));
  expect(campaignClock.writes).toHaveBeenCalledTimes(4);
});
