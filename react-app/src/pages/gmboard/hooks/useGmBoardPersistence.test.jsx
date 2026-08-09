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

vi.mock('../../../shared/hexcrawl/useCampaignClock.js', () => ({
  useCampaignClock: () => ({
    active: false,
    clock: null,
    error: null,
    saveClock: vi.fn(),
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

test('table edits autosave locally and announce cloud sync', async () => {
  localStorage.clear();
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
