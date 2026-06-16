import { requireClient } from './supabaseClient.js';

// Create a campaign — caller becomes its GM and gets a unique invite code.
export async function createCampaign(name) {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('create_campaign', { p_name: name || 'Campaign' });
  if (error) throw error;
  return data;
}

// Join a campaign with an invite code.
export async function joinCampaign(code) {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('join_campaign', { p_code: code });
  if (error) throw error;
  return data;
}

// Campaigns the current user belongs to (member or GM).
export async function listMyCampaigns() {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, gm, join_code, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Roster of a campaign (member rows). Usernames are shown from the character
// rows instead (profiles RLS blocks reading other users' profiles).
export async function listCampaignMembers(campaignId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('campaign_members')
    .select('user_id, joined_at')
    .eq('campaign_id', campaignId);
  if (error) throw error;
  return (data || []).map((m) => ({ userId: m.user_id, joinedAt: m.joined_at }));
}

// All character sheets attached to a campaign (RLS lets members read them).
export async function listCampaignCharacters(campaignId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, owner, owner_username, updated_at, data')
    .eq('campaign_id', campaignId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Attach (or detach with null) one of MY characters to a campaign.
export async function setCharacterCampaign(charId, campaignId) {
  const supabase = requireClient();
  const { error } = await supabase
    .from('characters')
    .update({ campaign_id: campaignId })
    .eq('id', charId);
  if (error) throw error;
}

// Delete a campaign (GM only, enforced by RLS). FK rules: membership rows cascade
// away, and member characters are detached (campaign_id set to null), not deleted.
export async function deleteCampaign(campaignId) {
  const supabase = requireClient();
  const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);
  if (error) throw error;
}

export async function leaveCampaign(campaignId) {
  const supabase = requireClient();
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  const { error } = await supabase
    .from('campaign_members')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('user_id', uid);
  if (error) throw error;
}
