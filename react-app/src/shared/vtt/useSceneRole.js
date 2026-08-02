import { useEffect, useState } from 'react';
import { useAuth } from '../cloud/AuthProvider.jsx';
import { listMyCampaigns } from '../cloud/campaigns.js';
import { listMyCharacters } from '../cloud/cloudCharacters.js';

// Who the viewer is on this scene: the campaign's GM, or a player who may move
// the pieces standing for their own sheets.
//
// This decides what the interface offers, never what is allowed — RLS already
// refuses the rest. Getting it wrong here shows a cursor that lies, not a
// security hole.

const IDLE = Object.freeze({ loading: true, isGm: false, ownedCharacterIds: [] });

export function useSceneRole(campaignId) {
  const { cloudEnabled, status, user } = useAuth();
  const userId = user?.id;
  const [role, setRole] = useState(IDLE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!campaignId || !cloudEnabled || status !== 'authed' || !userId) {
        setRole({ loading: false, isGm: false, ownedCharacterIds: [] });
        return;
      }
      try {
        const [campaigns, characters] = await Promise.all([
          listMyCampaigns(),
          listMyCharacters(),
        ]);
        if (cancelled) return;
        const campaign = campaigns.find((entry) => entry.id === campaignId) || null;
        setRole({
          loading: false,
          isGm: Boolean(campaign && campaign.gm === userId),
          // Only sheets attached to this campaign can hold a token in it.
          ownedCharacterIds: characters
            .filter((character) => character.campaign_id === campaignId)
            .map((character) => character.id),
        });
      } catch (_) {
        // Falling back to "player with no pieces" keeps the scene readable
        // instead of blank, and the database still refuses anything else.
        if (!cancelled) setRole({ loading: false, isGm: false, ownedCharacterIds: [] });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [campaignId, cloudEnabled, status, userId]);

  return role;
}
