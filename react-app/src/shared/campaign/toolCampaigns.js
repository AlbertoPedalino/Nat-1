import { normalizeLinkGroupId } from '../instances/linkGroupId.js';
import { groupField } from '../content/filterFields.js';

// Which campaign a saved tool belongs to, the one rule for every place that
// asks (the library's campaign filter, the Links menu).

// A campaign as these rules read it, from its cloud row (listMyCampaigns).
export function campaignLinks(row) {
  return {
    id: row.id,
    name: row.name || 'Campaign',
    linkGroupId: normalizeLinkGroupId(row.link_group_id),
    hexcrawlBoardId: row.hexcrawl_board_id || null,
    dungeonEncounterId: row.dungeon_encounter_id || null,
  };
}

// Whether a GM board, an encounter or a DM screen (`tool`: { id, linkGroupId })
// belongs to `campaign` (campaignLinks): it is linked with the campaign's
// tools (the same link group), or the campaign uses it as its hexcrawl board
// or its dungeon.
export function toolInCampaign(sectionKey, tool, campaign) {
  const group = normalizeLinkGroupId(tool?.linkGroupId);
  return Boolean(
    (group && group === campaign.linkGroupId)
    || (sectionKey === 'gmboard' && tool.id === campaign.hexcrawlBoardId)
    || (sectionKey === 'encounters' && tool.id === campaign.dungeonEncounterId),
  );
}

// The ids of the `campaigns` (campaignLinks) a row of a library list belongs
// to. A character belongs to the campaign it was added to, when that is one
// of `campaigns` (a GM sees sheets of campaigns they are not in).
export function toolCampaignIds(sectionKey, row, campaigns = []) {
  if (!row) return [];
  if (sectionKey === 'characters') {
    return campaigns.some((campaign) => campaign.id === row.campaignId) ? [row.campaignId] : [];
  }
  return campaigns.filter((campaign) => toolInCampaign(sectionKey, row, campaign)).map((campaign) => campaign.id);
}

// A list's campaign filter (filterFields' groupField): each of `campaigns`,
// and the rows in none. `campaignIdsOf(row)` is a row's campaign ids.
export function campaignFilterField(campaigns, campaignIdsOf) {
  const groups = campaigns.map((campaign) => ({ key: campaign.id, label: campaign.name }));
  return groupField({
    key: 'campaign', label: 'Campaign', groups: () => groups, noneLabel: 'No campaign', groupsOf: campaignIdsOf,
  });
}
