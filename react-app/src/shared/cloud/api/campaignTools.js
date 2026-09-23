import { requireClient } from '../supabaseClient.js';
import { normalizeLinkGroupId } from '../../instances/linkGroupId.js';

export async function readCampaignToolLinks(campaignId) {
  if (!campaignId) return null;
  const { data, error } = await requireClient().from('campaigns')
    .select('id, name, link_group_id, hexcrawl_board_id').eq('id', campaignId).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function setCampaignToolGroup(campaignId, value) {
  const groupId = normalizeLinkGroupId(value);
  if (!campaignId || (value != null && !groupId)) throw new Error('Invalid campaign link.');
  const { data, error } = await requireClient().from('campaigns')
    .update({ link_group_id: groupId, ...(!groupId ? { hexcrawl_board_id: null } : {}) })
    .eq('id', campaignId).select('id').single();
  if (error) throw error;
  if (!data) throw new Error('Could not update campaign links.');
}
