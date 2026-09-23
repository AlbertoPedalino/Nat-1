import { requireClient } from '../supabaseClient.js';
import { normalizeLinkGroupId } from '../../instances/linkGroupId.js';

export async function readCampaignToolLinks(campaignId) {
  if (!campaignId) return null;
  const { data, error } = await requireClient().from('campaigns')
    .select('id, name, link_group_id, hexcrawl_board_id, dungeon_encounter_id').eq('id', campaignId).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function setCampaignToolGroup(campaignId, value) {
  const groupId = normalizeLinkGroupId(value);
  if (!campaignId || (value != null && !groupId)) throw new Error('Invalid campaign link.');
  const { data, error } = await requireClient().from('campaigns')
    .update({ link_group_id: groupId, ...(!groupId ? { hexcrawl_board_id: null, dungeon_encounter_id: null } : {}) })
    .eq('id', campaignId).select('id').single();
  if (error) throw error;
  if (!data) throw new Error('Could not update campaign links.');
}

export async function setCampaignDungeonEncounter(campaignId, encounterId) {
  if (!campaignId) throw new Error('No campaign selected.');
  const client = requireClient();
  let groupId;
  if (encounterId) {
    const campaign = await readCampaignToolLinks(campaignId);
    groupId = normalizeLinkGroupId(campaign?.link_group_id);
    if (!groupId) throw new Error('Link an Encounter Builder to this campaign first.');
    const { data, error } = await client.from('encounters').select('id')
      .eq('id', encounterId).eq('link_group_id', groupId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This Encounter Builder is no longer linked to the campaign.');
  }
  let query = client.from('campaigns')
    .update({ dungeon_encounter_id: encounterId || null }).eq('id', campaignId);
  // Do not save a selection against a group changed by another tab meanwhile.
  if (groupId) query = query.eq('link_group_id', groupId);
  const { data, error } = await query.select('id').single();
  if (error) throw error;
  if (!data) throw new Error('Could not update the dungeon Encounter Builder.');
}
