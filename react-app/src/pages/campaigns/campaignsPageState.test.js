import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCampaignsPageState } from './campaignsPageState.js';

test('resolveCampaignsPageState distinguishes every cloud and session gate', () => {
  assert.equal(resolveCampaignsPageState({ cloudEnabled: false, status: 'signedOut' }), 'unconfigured');
  assert.equal(resolveCampaignsPageState({ cloudEnabled: true, status: 'loading' }), 'loading');
  assert.equal(resolveCampaignsPageState({ cloudEnabled: true, status: 'signedOut' }), 'signedOut');
  assert.equal(resolveCampaignsPageState({ cloudEnabled: true, status: 'authed' }), 'authed');
  assert.notEqual(resolveCampaignsPageState({ cloudEnabled: true, status: 'loading' }), 'signedOut');
});
