import { useCallback, useMemo } from 'react';
import { loadClassAdapters, loadCoreAdapters } from '../../../adapters/index.js';
import { useGmCampaigns } from '../../../shared/campaign/useGmCampaigns.js';
import { toEncounterPlayer } from './campaignPlayer.js';
import { classNames } from '../../../shared/character/progression/classLevel.js';

// Summaries (initiative, AC…) need the class/subclass adapters registered
// before summarizeCharacter runs, so every fetch path loads them first. The
// fetching itself lives in useGmCampaigns, shared with the VTT roster — only
// this adapter-backed mapping is specific to the encounter builder.
async function rowsToPlayers(rows, campaign) {
  const playerClasses = [...new Set(rows.flatMap((row) => classNames(row?.data)))];
  await Promise.all([
    loadCoreAdapters().catch(() => {}),
    loadClassAdapters(playerClasses).catch(() => {}),
  ]);
  return rows.map((row) => toEncounterPlayer(row, campaign));
}

export function useCampaignPlayers() {
  const { campaigns, refreshCampaign, ...rest } = useGmCampaigns({
    mapRows: rowsToPlayers,
    errorMessage: 'Failed to load campaign players.',
  });

  // The encounter builder has always called this list `players`; the shared hook
  // stays neutral and calls it `members`.
  const withPlayers = useMemo(
    () => campaigns.map((campaign) => ({ ...campaign, players: campaign.members })),
    [campaigns],
  );

  const refresh = useCallback(
    async (campaignId) => refreshCampaign(campaignId),
    [refreshCampaign],
  );

  return useMemo(
    () => ({ ...rest, campaigns: withPlayers, refreshCampaign: refresh }),
    [refresh, rest, withPlayers],
  );
}
