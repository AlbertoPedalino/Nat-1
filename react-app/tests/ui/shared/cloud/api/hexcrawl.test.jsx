import { vi } from 'vitest';
import { linkHexcrawlBoardCampaign, readCampaignClock, saveCampaignClock } from '../../../../../src/shared/cloud/api/hexcrawl.js';

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const query = {
    select: vi.fn(), eq: vi.fn(), neq: vi.fn(), update: vi.fn(), upsert: vi.fn(), single, maybeSingle: single,
  };
  return { query, from: vi.fn(() => query) };
});
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  requireClient: () => ({ from: mocks.from }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ['select', 'eq', 'neq', 'update', 'upsert']) mocks.query[key].mockReturnValue(mocks.query);
});

test('relinking only releases campaigns still assigned to this board and keeps the old link on failure', async () => {
  await linkHexcrawlBoardCampaign('board-one', 'campaign-new');
  expect(mocks.query.update.mock.calls).toEqual([
    [{ hexcrawl_board_id: 'board-one' }], [{ hexcrawl_board_id: null }],
  ]);
  expect(mocks.query.eq.mock.calls).toEqual([
    ['id', 'campaign-new'], ['hexcrawl_board_id', 'board-one'],
  ]);
  expect(mocks.query.neq).toHaveBeenCalledWith('id', 'campaign-new');
  mocks.query.update.mockClear().mockImplementationOnce(() => { throw new Error('Permission denied'); });
  await expect(linkHexcrawlBoardCampaign('board-one', 'campaign-new')).rejects.toThrow('Permission denied');
  expect(mocks.query.update).toHaveBeenCalledTimes(1);
});

test('travel settings round-trip through the campaign row, including explicit clears', async () => {
  mocks.query.single.mockResolvedValue({ data: {
    campaign_id: 'campaign-one', travel_configured: true, terrain: null,
    pop: 'frontier', hex_tier: null, mount_speed: 2, season: null,
  }, error: null });
  const clock = await saveCampaignClock('campaign-one', { terrain: null, hexTier: null, mountSpeed: 2 });
  expect(mocks.query.upsert).toHaveBeenCalledWith({
    campaign_id: 'campaign-one', terrain: null, hex_tier: null, mount_speed: 2,
  }, { onConflict: 'campaign_id' });
  expect(clock).toMatchObject({ travelConfigured: true, terrain: null, pop: 'frontier', hexTier: null, mountSpeed: 2, season: null });
  expect(await readCampaignClock('campaign-one')).toEqual(clock);
});
