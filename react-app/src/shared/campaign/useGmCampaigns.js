import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../cloud/AuthProvider.jsx';
import { listCampaignCharacters, listMyCampaigns } from '../cloud/campaigns.js';

// Loads the campaigns where the signed-in user is GM, together with their
// character rows. The caller supplies `mapRows` because consumers want different
// shapes: the encounter builder needs adapter-backed summaries, a map token only
// needs a name and a colour. Keeping the mapper out means this module never
// imports the adapter barrel, and the VTT does not pay for it.

const IDLE = Object.freeze({
  cloudEnabled: false,
  status: 'disabled',
  signedIn: false,
  loading: false,
  campaigns: [],
  error: null,
});

export function useGmCampaigns({ mapRows, errorMessage = 'Failed to load campaign characters.' }) {
  const { cloudEnabled, status, user } = useAuth();
  const userId = user?.id;
  const [payload, setPayload] = useState(() => ({
    ...IDLE,
    cloudEnabled,
    status: cloudEnabled ? 'loading' : 'disabled',
    loading: cloudEnabled,
  }));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!cloudEnabled) {
        setPayload(IDLE);
        return;
      }
      if (status === 'loading') {
        setPayload({ ...IDLE, cloudEnabled: true, status: 'loading', loading: true });
        return;
      }
      if (!userId) {
        setPayload({ ...IDLE, cloudEnabled: true, status: 'anon' });
        return;
      }

      setPayload((prev) => ({ ...prev, cloudEnabled: true, status: 'authed', signedIn: true, loading: true, error: null }));
      try {
        const mine = (await listMyCampaigns()).filter((campaign) => campaign.gm === userId);
        const campaigns = await Promise.all(mine.map(async (campaign) => {
          const meta = { id: campaign.id, name: campaign.name || 'Campaign', joinCode: campaign.join_code || null };
          return { ...meta, members: await mapRows(await listCampaignCharacters(campaign.id), meta) };
        }));
        if (!cancelled) {
          setPayload({ cloudEnabled: true, status: 'authed', signedIn: true, loading: false, campaigns, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setPayload({
            cloudEnabled: true,
            status: 'authed',
            signedIn: true,
            loading: false,
            campaigns: [],
            error: error?.message || errorMessage,
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
    // `mapRows` is intentionally out of the deps: consumers pass an inline
    // function, and depending on it would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudEnabled, status, userId]);

  // Re-read one campaign on demand, so a caller about to act on the roster gets
  // the current cloud state instead of the page-load snapshot.
  const refreshCampaign = useCallback(async (campaignId) => {
    if (!cloudEnabled || !userId || !campaignId) return null;
    const cached = payload.campaigns.find((campaign) => campaign.id === campaignId);
    if (!cached) return null;
    try {
      const rows = await listCampaignCharacters(campaignId);
      const members = await mapRows(rows, { id: cached.id, name: cached.name });
      setPayload((prev) => ({
        ...prev,
        error: null,
        campaigns: prev.campaigns.map((campaign) => (
          campaign.id === campaignId ? { ...campaign, members } : campaign
        )),
      }));
      return members;
    } catch (error) {
      setPayload((prev) => ({ ...prev, error: error?.message || errorMessage }));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudEnabled, userId, payload.campaigns]);

  return useMemo(() => ({ ...payload, refreshCampaign }), [payload, refreshCampaign]);
}
