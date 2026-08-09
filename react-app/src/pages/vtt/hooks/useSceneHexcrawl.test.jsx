import { act, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useSceneHexcrawl } from './useSceneHexcrawl.js';

const cloud = vi.hoisted(() => ({
  listHexCells: vi.fn(),
  readCampaignHexcrawlBoard: vi.fn(),
  readHexcrawlBoard: vi.fn(),
  readHexcrawlBoardVersion: vi.fn(),
  saveHexCell: vi.fn(),
  subscribeHexcrawl: vi.fn(),
}));

vi.mock('../../../shared/cloud/hexcrawl.js', () => cloud);

vi.mock('../../../shared/hexcrawl/useCampaignClock.js', () => ({
  useCampaignClock: () => ({
    active: true,
    clock: null,
    log: [],
    error: null,
    saveClock: vi.fn(),
  }),
}));

let hexcrawl;

function Probe() {
  hexcrawl = useSceneHexcrawl({
    scene: { id: 'scene-one', campaignId: 'campaign-one', grid: { shape: 'hex' } },
    isGm: true,
  });
  return null;
}

beforeEach(() => {
  cloud.listHexCells.mockReset().mockResolvedValue([]);
  cloud.readCampaignHexcrawlBoard.mockReset().mockResolvedValue('board-one');
  cloud.readHexcrawlBoard.mockReset();
  cloud.readHexcrawlBoardVersion.mockReset().mockResolvedValue(1);
  cloud.saveHexCell.mockReset();
  cloud.subscribeHexcrawl.mockReset().mockReturnValue(() => {});
});

test('an open VTT refreshes the linked GM Board after it changes', async () => {
  cloud.readHexcrawlBoard
    .mockResolvedValueOnce({ id: 'board-one', updatedAt: 1, state: { season: 'Summer' }, tables: { revision: 1 } })
    .mockResolvedValueOnce({ id: 'board-one', updatedAt: 2, state: { season: 'Winter' }, tables: { revision: 2 } });

  render(<Probe />);
  await waitFor(() => expect(hexcrawl.board?.tables.revision).toBe(1));

  cloud.readHexcrawlBoardVersion.mockResolvedValue(2);
  act(() => window.dispatchEvent(new Event('focus')));

  await waitFor(() => expect(hexcrawl.board?.tables.revision).toBe(2));
  expect(hexcrawl.board.state.season).toBe('Winter');
});
