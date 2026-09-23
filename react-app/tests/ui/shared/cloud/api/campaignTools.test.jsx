import { beforeEach, expect, test, vi } from 'vitest';
import { readCampaignToolLinks, setCampaignToolGroup } from '../../../../../src/shared/cloud/api/campaignTools.js';

const mocks = vi.hoisted(() => ({
  query: { select: vi.fn(), update: vi.fn(), eq: vi.fn(), single: vi.fn(), maybeSingle: vi.fn() },
}));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  requireClient: () => ({ from: () => mocks.query }),
}));
beforeEach(() => {
  vi.resetAllMocks();
  for (const key of ['select', 'update', 'eq']) mocks.query[key].mockReturnValue(mocks.query);
  mocks.query.single.mockResolvedValue({ data: { id: 'campaign' }, error: null });
});

test('reading a campaign group works after its board is detached', async () => {
  const campaign = { id: 'campaign', link_group_id: 'link_party', hexcrawl_board_id: null };
  mocks.query.maybeSingle.mockResolvedValue({ data: campaign, error: null });
  expect(await readCampaignToolLinks('campaign')).toEqual(campaign);
});

test('unlink only clears this campaign’s membership and hexcrawl assignment', async () => {
  await setCampaignToolGroup('campaign', null);
  expect(mocks.query.update).toHaveBeenCalledWith({ link_group_id: null, hexcrawl_board_id: null });
  expect(mocks.query.eq).toHaveBeenCalledWith('id', 'campaign');
  expect(mocks.query.update).toHaveBeenCalledTimes(1);
});

test('joining a tool group preserves the selected hexcrawl board', async () => {
  await setCampaignToolGroup('campaign', 'link_party');
  expect(mocks.query.update).toHaveBeenCalledWith({ link_group_id: 'link_party' });
});

test('invalid groups and denied writes do not report success', async () => {
  await expect(setCampaignToolGroup('campaign', 'bad group!')).rejects.toThrow('Invalid campaign link');
  expect(mocks.query.update).not.toHaveBeenCalled();
  mocks.query.single.mockResolvedValue({ data: null, error: new Error('Permission denied') });
  await expect(setCampaignToolGroup('campaign', null)).rejects.toThrow('Permission denied');
});
