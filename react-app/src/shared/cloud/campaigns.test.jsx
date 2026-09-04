import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const cleanup = vi.fn(async () => {});
  const eq = vi.fn(async () => ({ error: null }));
  const removeCampaign = vi.fn(() => ({ eq }));
  const client = { from: vi.fn(() => ({ delete: removeCampaign })) };
  return { cleanup, client, eq, removeCampaign };
});

vi.mock('./supabaseClient.js', () => ({
  requireClient: () => mocks.client,
}));

vi.mock('./vtt.js', () => ({
  deleteCampaignMapImages: mocks.cleanup,
}));

import { deleteCampaign } from './campaigns.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cleanup.mockResolvedValue();
  mocks.eq.mockResolvedValue({ error: null });
});

test('campaign images are removed while the campaign still grants Storage access', async () => {
  await deleteCampaign('campaign-1');

  expect(mocks.cleanup).toHaveBeenCalledWith('campaign-1');
  expect(mocks.client.from).toHaveBeenCalledWith('campaigns');
  expect(mocks.eq).toHaveBeenCalledWith('id', 'campaign-1');
  expect(mocks.cleanup.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.removeCampaign.mock.invocationCallOrder[0],
  );
});
