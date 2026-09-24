import { act, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useSceneHexcrawl } from '../../../../../src/pages/vtt/hexcrawl/useSceneHexcrawl.js';
import { createDefaultTables } from '../../../../../src/pages/gmboard/tables/defaultTables.js';

const cloud = vi.hoisted(() => ({
  listHexCells: vi.fn(),
  readCampaignHexcrawlBoard: vi.fn(),
  readHexcrawlBoard: vi.fn(),
  readHexcrawlBoardVersion: vi.fn(),
  saveHexCell: vi.fn(),
  subscribeHexcrawl: vi.fn(),
}));

vi.mock('../../../../../src/shared/cloud/api/hexcrawl.js', () => cloud);

const campaignClock = vi.hoisted(() => ({
    active: true,
    clock: null,
    log: [],
    error: null,
    saveClock: vi.fn(),
}));
vi.mock('../../../../../src/shared/hexcrawl/useCampaignClock.js', () => ({
  useCampaignClock: (...args) => { campaignClock.args = args; return campaignClock; },
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
  localStorage.clear();
  campaignClock.clock = null;
  campaignClock.saveClock.mockReset().mockResolvedValue(null);
  cloud.listHexCells.mockReset().mockResolvedValue([]);
  cloud.readCampaignHexcrawlBoard.mockReset().mockResolvedValue('board-one');
  cloud.readHexcrawlBoard.mockReset();
  cloud.readHexcrawlBoardVersion.mockReset().mockResolvedValue(1);
  cloud.saveHexCell.mockReset();
  cloud.subscribeHexcrawl.mockReset().mockReturnValue(() => {});
});

test('map inherits board travel settings instead of stale browser defaults', async () => {
  localStorage.setItem('gb:hexcrawl:defaults:scene-one', JSON.stringify({ terrain: 'Road', mountSpeed: 1 }));
  cloud.readHexcrawlBoard.mockResolvedValue({
    id: 'board-one', updatedAt: 1,
    state: { season: 'Summer', terrain: 'Forest', pop: 'frontier', hexTier: 2, mountSpeed: 2 },
    tables: createDefaultTables(),
  });
  render(<Probe />);
  await waitFor(() => expect(hexcrawl.defaults).toEqual({ terrain: 'Forest', pop: 'frontier', tier: 2, mountSpeed: 2 }));
  await act(async () => hexcrawl.setDefaults({ tier: 3 }));
  const write = campaignClock.saveClock.mock.calls[0][0];
  expect(write(null)).toMatchObject({ travelConfigured: true, terrain: 'Forest', hexTier: 3, mountSpeed: 2, season: 'Summer' });
  // A prior queued edit has configured the row: only this selection is written.
  expect(write({ travelConfigured: true })).toEqual({ hexTier: 3 });
});

test('campaign settings reach the map and its rolls, while existing hex terrain stays', async () => {
  campaignClock.clock = {
    travelConfigured: true, terrain: 'Forest', pop: 'frontier', hexTier: 2, mountSpeed: 2,
    season: 'Summer', min: 0, day: 1, month: 1, year: 1000,
    meteo: 'Clear', intensity: '', hoursSinceWeather: 0, nextWeatherIn: 24,
  };
  cloud.listHexCells.mockResolvedValue([{ q: 0, r: 0, terrain: 'Road', status: 'unexplored' }]);
  cloud.readHexcrawlBoard.mockResolvedValue({ id: 'board-one', updatedAt: 1, state: {}, tables: createDefaultTables() });
  const { rerender } = render(<Probe />);
  await waitFor(() => expect(hexcrawl.board).not.toBeNull());
  expect(hexcrawl.defaults).toEqual({ terrain: 'Forest', pop: 'frontier', tier: 2, mountSpeed: 2 });
  act(() => hexcrawl.clickHex({ q: 0, r: 0 }));
  await waitFor(() => expect(cloud.saveHexCell).toHaveBeenCalled());
  expect(cloud.saveHexCell).toHaveBeenCalledWith('scene-one', expect.anything(), expect.objectContaining({ terrain: 'Road', pop: 'frontier', tier: 2 }));
  expect(hexcrawl.lastHex.travelHours).toBe(0.5);
  campaignClock.clock = { ...campaignClock.clock, terrain: null, hexTier: null };
  rerender(<Probe />);
  expect(hexcrawl.defaults.terrain).toBeNull();
  expect(hexcrawl.defaults.tier).toBeNull();
});

test('changing season does not overwrite the campaign time or weather', async () => {
  cloud.readHexcrawlBoard.mockResolvedValue({ id: 'board-one', updatedAt: 1, state: { min: 10, meteo: 'Rain' }, tables: {} });
  campaignClock.clock = { travelConfigured: true, min: 800, meteo: 'Clear', season: 'Summer' };
  render(<Probe />);
  await waitFor(() => expect(hexcrawl.board).not.toBeNull());
  await act(async () => hexcrawl.setSeason(null));
  expect(campaignClock.saveClock.mock.calls[0][0](campaignClock.clock)).toEqual({ season: null });
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

test('a square map leaves the campaign clock alone', async () => {
  function SquareProbe() {
    hexcrawl = useSceneHexcrawl({
      scene: { id: 'scene-square', campaignId: 'campaign-one', grid: { shape: 'square' } },
      isGm: true,
    });
    return null;
  }
  render(<SquareProbe />);
  await act(async () => {});
  expect(campaignClock.args[0]).toBeNull();
  expect(cloud.readCampaignHexcrawlBoard).not.toHaveBeenCalled();

  render(<Probe />);
  await act(async () => {});
  expect(campaignClock.args[0]).toBe('campaign-one');
});
