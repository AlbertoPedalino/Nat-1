import { useCallback, useMemo } from 'react';
import { useGmCampaigns } from '../../../shared/campaign/useGmCampaigns.js';
import { toEncounterPlayer } from './campaignPlayer.js';
import { ensureSheetRuntimeAdapters } from '../../../shared/character/sheet/sheetRuntimeAdapters.js';

// Summaries (initiative, AC…) need the class/subclass adapters registered
// before summarizeCharacter runs, so every fetch path loads them first. The
// fetching itself lives in useGmCampaigns, shared with the VTT roster — only
// this adapter-backed mapping is specific to the encounter builder.
async function rowsToPlayers(rows, campaign) {
  await ensureSheetRuntimeAdapters(rows.map((row) => row?.data));
  return rows.map((row) => toEncounterPlayer(row, campaign));
}

export function useCampaignPlayers() {
  const { campaigns, refreshCampaign, ...rest } = useGmCampaigns({
    mapRows: rowsToPlayers,
    errorMessage: 'Could not load campaign players.',
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
