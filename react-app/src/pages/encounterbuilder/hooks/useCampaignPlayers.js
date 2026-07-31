import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadClassAdapters, loadCoreAdapters } from '../../../adapters/index.js';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { listCampaignCharacters, listMyCampaigns } from '../../../shared/cloud/campaigns.js';
import { characterClassNames, toEncounterPlayer } from '../logic/campaignPlayer.js';

// Summaries (initiative, AC…) need the class/subclass adapters registered
// before summarizeCharacter runs, so every fetch path loads them first.
async function rowsToPlayers(rows, campaign) {
  const classNames = [...new Set(rows.flatMap((row) => characterClassNames(row?.data)))];
  await Promise.all([
    loadCoreAdapters().catch(() => {}),
    loadClassAdapters(classNames).catch(() => {}),
  ]);
  return rows.map((row) => toEncounterPlayer(row, campaign));
}

async function fetchGmCampaigns(userId) {
  const campaigns = (await listMyCampaigns()).filter((campaign) => campaign.gm === userId);
  return Promise.all(campaigns.map(async (campaign) => ({
    id: campaign.id,
    name: campaign.name || 'Campaign',
    joinCode: campaign.join_code || null,
    players: await rowsToPlayers(await listCampaignCharacters(campaign.id), campaign),
  })));
}

export function useCampaignPlayers() {
  const { cloudEnabled, status, user } = useAuth();
  const userId = user?.id;
  const [payload, setPayload] = useState({
    cloudEnabled,
    status: cloudEnabled ? 'loading' : 'disabled',
    signedIn: false,
    loading: cloudEnabled,
    campaigns: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!cloudEnabled) {
        setPayload({ cloudEnabled: false, status: 'disabled', signedIn: false, loading: false, campaigns: [], error: null });
        return;
      }
      if (status === 'loading') {
        setPayload({ cloudEnabled: true, status: 'loading', signedIn: false, loading: true, campaigns: [], error: null });
        return;
      }
      if (!userId) {
        setPayload({ cloudEnabled: true, status: 'anon', signedIn: false, loading: false, campaigns: [], error: null });
        return;
      }

      setPayload((prev) => ({ ...prev, cloudEnabled: true, status: 'authed', signedIn: true, loading: true, error: null }));
      try {
        const withPlayers = await fetchGmCampaigns(userId);
        if (!cancelled) {
          setPayload({ cloudEnabled: true, status: 'authed', signedIn: true, loading: false, campaigns: withPlayers, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setPayload({
            cloudEnabled: true,
            status: 'authed',
            signedIn: true,
            loading: false,
            campaigns: [],
            error: error?.message || 'Failed to load campaign players.',
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cloudEnabled, status, userId]);

  // Re-fetch ONE campaign's sheets on demand (right before importing players,
  // so the encounter gets their latest cloud state instead of the page-load
  // snapshot). The campaign list itself only repopulates on page load.
  // Returns the fresh player list, or null when unavailable/failed — callers
  // fall back to the cached list in that case.
  const refreshCampaign = useCallback(async (campaignId) => {
    if (!cloudEnabled || !userId || !campaignId) return null;
    const cached = payload.campaigns.find((campaign) => campaign.id === campaignId);
    if (!cached) return null;
    try {
      const rows = await listCampaignCharacters(campaignId);
      const players = await rowsToPlayers(rows, { id: cached.id, name: cached.name });
      setPayload((prev) => ({
        ...prev,
        error: null,
        campaigns: prev.campaigns.map((campaign) => (
          campaign.id === campaignId ? { ...campaign, players } : campaign
        )),
      }));
      return players;
    } catch (error) {
      setPayload((prev) => ({ ...prev, error: error?.message || 'Failed to load campaign players.' }));
      return null;
    }
  }, [cloudEnabled, userId, payload.campaigns]);

  return useMemo(() => ({ ...payload, refreshCampaign }), [payload, refreshCampaign]);
}
