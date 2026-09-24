import { useMemo } from 'react';
import { useCharacterDigests } from '../../../shared/cloud/sync/useCharacterDigests.js';
import { rosterFromDigests } from '../../../shared/campaign/characterDigest.js';

// The campaign's characters as the battle map shows them: name, portrait,
// class colour, hit points, death saves and conditions — from their digests,
// never from the full sheets.
export function useCampaignRoster(campaignId) {
  const { digests, baseMax } = useCharacterDigests({ campaignId });
  return useMemo(() => rosterFromDigests(digests, baseMax), [digests, baseMax]);
}
