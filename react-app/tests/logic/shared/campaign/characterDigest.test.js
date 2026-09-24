import test from 'node:test';
import assert from 'node:assert/strict';
import {
  digestFromVitalsAnswer,
  digestMaxHp,
  isNewerDigest,
  rosterFromDigests,
  sheetVitalsFromDigest,
  toCharacterDigest,
} from '../../../../src/shared/campaign/characterDigest.js';

const row = (patch = {}, digest = {}) => ({
  character_id: 'pc',
  campaign_id: 'camp',
  owner: 'user-1',
  row_revision: 5,
  digest: {
    name: 'Aria', ownerUsername: 'aria', className: 'Fighter', classIconColor: '#AABBCC',
    portraitPath: 'art/aria.webp', currentHP: 12, tempHP: 3, maxHPBonus: 2,
    deathSaves: { success: 1, fail: 0 }, activeConditions: ['prone'], hpBasis: 'h1', ...digest,
  },
  ...patch,
});

test('a digest row becomes the roster facts, vitals and max-HP basis', () => {
  const digest = toCharacterDigest(row());
  assert.deepEqual(digest, {
    characterId: 'pc', campaignId: 'camp', ownerId: 'user-1', rowRevision: 5, source: 'server',
    name: 'Aria', ownerUsername: 'aria', className: 'Fighter', classIconColor: '#aabbcc',
    portraitPath: 'art/aria.webp', currentHP: 12, tempHP: 3, maxHPBonus: 2,
    deathSaves: { success: 1, fail: 0 }, activeConditions: ['prone'], hpBasis: 'h1',
  });
  assert.equal(toCharacterDigest({ character_id: 'pc' }), null);
});

test('max HP is the base maximum plus the bonus, and absent current HP means undamaged', () => {
  const digest = toCharacterDigest(row({}, { currentHP: null, maxHPBonus: 5 }));
  assert.equal(digestMaxHp(digest, 20), 25);
  assert.equal(digestMaxHp(digest, undefined), null);
  assert.deepEqual(sheetVitalsFromDigest(digest, 20), {
    currentHP: 25, tempHP: 3, maxHPBonus: 5, deathSaves: { success: 1, fail: 0 }, activeConditions: ['prone'], maxHP: 25,
  });
  const over = toCharacterDigest(row({}, { currentHP: 99, maxHPBonus: 0 }));
  assert.equal(sheetVitalsFromDigest(over, 20).currentHP, 20);
});

test('revisions order digests; the database settles a local preview of the same revision', () => {
  const server = toCharacterDigest(row());
  const newer = toCharacterDigest(row({ row_revision: 6 }));
  assert.equal(isNewerDigest(newer, server), true);
  assert.equal(isNewerDigest(server, newer), false);
  const answer = {
    applied: true, characterId: 'pc', digestRevision: 6, hpBasis: 'h1',
    vitals: { currentHP: 4, tempHP: 0, maxHPBonus: 2, deathSaves: { success: 0, fail: 0 }, activeConditions: [] },
  };
  const local = digestFromVitalsAnswer(answer, server);
  assert.equal(local.source, 'local');
  assert.equal(local.rowRevision, 6, 'the preview carries the digest revision the command produced');
  assert.equal(local.hpBasis, 'h1');
  assert.equal(local.currentHP, 4);
  assert.equal(local.portraitPath, 'art/aria.webp', 'roster facts come from the digest already held');
  assert.equal(isNewerDigest(local, server), true);
  assert.equal(isNewerDigest(newer, local), true);
  assert.equal(digestFromVitalsAnswer({ ...answer, hpBasis: 'h2' }, server).hpBasis, 'h2', 'the answer knows the current basis');
  assert.equal(digestFromVitalsAnswer(answer, null), null, 'unknown characters wait for their digest');
  assert.equal(digestFromVitalsAnswer({ ...answer, characterId: 'other' }, server), null);
  assert.equal(digestFromVitalsAnswer({ ...answer, digestRevision: null }, server), null);
});

test('the roster is sorted and shows hit points only once the base maximum is known', () => {
  const digests = new Map([
    ['b', toCharacterDigest(row({ character_id: 'b' }, { name: 'Zed' }))],
    ['a', toCharacterDigest(row({ character_id: 'a' }, { name: 'Aria' }))],
  ]);
  const roster = rosterFromDigests(digests, new Map([['a', { hpBasis: 'h1', baseMax: 20 }]]));
  assert.deepEqual(roster.map((entry) => entry.name), ['Aria', 'Zed']);
  assert.deepEqual(
    { hpCurrent: roster[0].hpCurrent, hpMax: roster[0].hpMax, tempHp: roster[0].tempHp, color: roster[0].color },
    { hpCurrent: 12, hpMax: 22, tempHp: 3, color: '#aabbcc' },
  );
  assert.equal(roster[1].hpMax, null);
  assert.deepEqual(roster[1].conditions, ['prone']);
});
