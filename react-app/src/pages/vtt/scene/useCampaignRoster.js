import { useMemo } from 'react';
import { useCharacterDigests } from '../../../shared/cloud/sync/useCharacterDigests.js';
import { rosterFromDigests } from '../../../shared/campaign/characterDigest.js';

// The campaign's characters as the battle map shows them: name, portrait,
// class colour, hit points, death saves and conditions — from their digests,
// never from the full sheets. The digests and base maxima are returned too: a
// sheet opened on the map takes its vitals from them instead of following its
// own, and a health command starts from them instead of reading the sheet.
export function useCampaignRoster(campaignId) {
  const { digests, baseMax } = useCharacterDigests({ campaignId });
  const roster = useMemo(() => rosterFromDigests(digests, baseMax), [digests, baseMax]);
  return { roster, digests, baseMax };
}
