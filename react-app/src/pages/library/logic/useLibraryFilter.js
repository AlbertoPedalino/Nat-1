import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { listMyCampaigns } from '../../../shared/cloud/api/campaigns.js';
import { campaignFilterField, campaignLinks, toolCampaignIds } from '../../../shared/campaign/toolCampaigns.js';
import { useListFilter } from '../../../shared/ui/useListFilter.js';

// A save is found by its name or, on a GM's list, by its player.
const rowText = (row) => [row.name, row.ownerUsername];

// The campaigns the signed-in user is in (as a player or their GM), as
// campaignLinks reads them; none offline or signed out. A failure leaves the
// list without a campaign filter rather than broken.
function useLibraryCampaigns() {
  const { cloudActive, user } = useAuth();
  const userId = user?.id;
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    if (!cloudActive || !userId) {
      setCampaigns([]);
      return undefined;
    }
    let cancelled = false;
    listMyCampaigns()
      .then((rows) => { if (!cancelled) setCampaigns(rows.map(campaignLinks)); })
      .catch(() => { if (!cancelled) setCampaigns([]); });
    return () => { cancelled = true; };
  }, [cloudActive, userId]);

  return campaigns;
}

// The search and campaign filter of a library list (characters, GM boards,
// encounters, DM screens): `filter` goes to ListFilterBar, and the list shows
// `filter.visible`.
export function useLibraryFilter(sectionKey, rows) {
  const campaigns = useLibraryCampaigns();
  const campaignIdsOf = useCallback((row) => toolCampaignIds(sectionKey, row, campaigns), [sectionKey, campaigns]);
  const fields = useMemo(() => [campaignFilterField(campaigns, campaignIdsOf)], [campaigns, campaignIdsOf]);
  return useListFilter(rows, { getText: rowText, fields });
}
