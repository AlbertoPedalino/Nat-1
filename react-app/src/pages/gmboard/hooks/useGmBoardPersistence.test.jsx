import { act, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { GmBoardProvider, useGmBoard } from '../state/GmBoardContext.jsx';
import { createDefaultTables } from '../logic/defaultTables.js';
import {
  persistBoardResults,
  persistBoardState,
  persistBoardTables,
  readPersistedBoard,
  registerBoardInstance,
} from '../storage.js';

const campaignClock = vi.hoisted(() => ({
  active: false,
  clock: null,
  error: null,
  saveClock: vi.fn(),
}));

vi.mock('../../../shared/hexcrawl/useCampaignClock.js', () => ({
  useCampaignClock: () => ({
    ...campaignClock,
  }),
}));

vi.mock('../../../shared/cloud/hexcrawl.js', () => ({
  setCampaignHexcrawlBoard: vi.fn(),
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
  campaignClock.saveClock.mockResolvedValue(null);
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
  registerBoardInstance('clock-linked', 'Linked clock');
  persistBoardState('clock-linked', {
    ...readPersistedBoard('missing').state,
    campaignId: 'campaign-one',
    season: 'Summer',
  });

  render(
    <GmBoardProvider instanceId="clock-linked" instanceSaved>
      <Probe />
    </GmBoardProvider>,
  );
  await waitFor(() => expect(board.state.campaignId).toBe('campaign-one'));

  act(() => board.setStart({ day: 3, month: 4, year: 1234, min: 7 * 60 + 30 }));

  await waitFor(() => expect(campaignClock.saveClock).toHaveBeenCalledWith(expect.objectContaining({
    day: 3,
    month: 4,
    year: 1234,
    min: 7 * 60 + 30,
    season: 'Summer',
  })));
  await waitFor(() => expect(readPersistedBoard('clock-linked').state.year).toBe(1234));

  act(() => board.setTime(22 * 60 + 5));
  await waitFor(() => expect(campaignClock.saveClock).toHaveBeenLastCalledWith(expect.objectContaining({
    day: 3,
    month: 4,
    year: 1234,
    min: 22 * 60 + 5,
  })));

  act(() => board.setSeason('Winter'));
  await waitFor(() => expect(campaignClock.saveClock).toHaveBeenLastCalledWith(expect.objectContaining({
    season: 'Winter',
    min: 22 * 60 + 5,
  })));

  act(() => board.setWeatherOverride({ meteo: 'Snow', intensity: 'Heavy' }));
  await waitFor(() => expect(campaignClock.saveClock).toHaveBeenLastCalledWith(expect.objectContaining({
    season: 'Winter',
    meteo: 'Snow',
    intensity: 'Heavy',
  })));
});
