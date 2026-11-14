import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignLinks, toolCampaignIds, toolInCampaign } from '../../../../src/shared/campaign/toolCampaigns.js';

const campaigns = [
  { id: 'c1', name: 'Tavern', link_group_id: 'link-a', hexcrawl_board_id: 'board-9', dungeon_encounter_id: null },
  { id: 'c2', name: 'Crypt', link_group_id: ' link-b ', hexcrawl_board_id: null, dungeon_encounter_id: 'enc-7' },
].map(campaignLinks);

test('a tool belongs to the campaign it is linked with, whatever spacing the cloud kept', () => {
  assert.deepEqual(toolCampaignIds('dmscreen', { id: 'dm1', linkGroupId: 'link-b' }, campaigns), ['c2']);
  assert.deepEqual(toolCampaignIds('dmscreen', { id: 'dm2', linkGroupId: null }, campaigns), []);
});

test('a board or an encounter also belongs to the campaign that uses it', () => {
  assert.deepEqual(toolCampaignIds('gmboard', { id: 'board-9', linkGroupId: null }, campaigns), ['c1']);
  assert.deepEqual(toolCampaignIds('encounters', { id: 'enc-7', linkGroupId: 'link-a' }, campaigns), ['c1', 'c2']);
  assert.equal(toolInCampaign('dmscreen', { id: 'board-9' }, campaigns[0]), false);
});

test('a character belongs to the campaign it was added to, when it is one of the list', () => {
  assert.deepEqual(toolCampaignIds('characters', { id: 'ch', campaignId: 'c2', linkGroupId: 'link-a' }, campaigns), ['c2']);
  assert.deepEqual(toolCampaignIds('characters', { id: 'ch' }, campaigns), []);
  // A GM sees sheets of campaigns they are not in: those read as in no listed campaign.
  assert.deepEqual(toolCampaignIds('characters', { id: 'ch', campaignId: 'elsewhere' }, campaigns), []);
});
