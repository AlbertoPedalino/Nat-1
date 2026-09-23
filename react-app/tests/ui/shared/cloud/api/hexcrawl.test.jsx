import { vi } from 'vitest';
import { readCampaignClock, saveCampaignClock } from '../../../../../src/shared/cloud/api/hexcrawl.js';

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const query = {
    select: vi.fn(), eq: vi.fn(), upsert: vi.fn(), single, maybeSingle: single,
  };
  return { query, from: vi.fn(() => query) };
});
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  requireClient: () => ({ from: mocks.from }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ['select', 'eq', 'upsert']) mocks.query[key].mockReturnValue(mocks.query);
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
