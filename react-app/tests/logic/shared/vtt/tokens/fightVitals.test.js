import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMonsterVitalCommand,
  monsterVitalsPatch,
  newerFightRow,
  withGmTokenVitals,
} from '../../../../../src/shared/vtt/tokens/fightVitals.js';

// The battle map's copy of a fight row: a recovery read that left before a
// realtime event arrived must not put the older enemy vitals back.
test('the copy with the newer vitals revision is kept', () => {
  const held = { id: 'f1', vitals_revision: 5, fight: { round: 2 } };
  const late = { id: 'f1', vitals_revision: 4, fight: { round: 1 } };
  const next = { id: 'f1', vitals_revision: 6, fight: { round: 3 } };

  assert.equal(newerFightRow(held, late), held);
  assert.equal(newerFightRow(held, next), next);
  // A full save leaves the revision alone: same revision, newer row, taken.
  const resaved = { ...held, fight: { round: 9 } };
  assert.equal(newerFightRow(held, resaved), resaved);
});

test('a copy without a revision is not compared', () => {
  const held = { id: 'f1', vitals_revision: 5 };
  const bare = { id: 'f1' };
  assert.equal(newerFightRow(held, bare), bare);
  assert.equal(newerFightRow(bare, held), held);
  assert.equal(newerFightRow(undefined, held), held);
});

// Damage, healing, temporary and maximum HP from the piece menu, with the
// encounter builder's rules.
test('damage takes temporary hit points first and 0 HP is Dead', () => {
  const ogre = { hpCurrent: 10, hpMax: 59, tempHP: 5, activeConditions: [], isDead: false };
  assert.deepEqual(applyMonsterVitalCommand(ogre, { type: 'modifyHp', delta: -8 }), { ...ogre, tempHP: 0, hpCurrent: 7 });
  assert.deepEqual(applyMonsterVitalCommand(ogre, { type: 'modifyHp', delta: -40 }), {
    ...ogre, tempHP: 0, hpCurrent: 0, activeConditions: ['dead'], isDead: true,
  });
  // Healing stops at the maximum and brings a dead creature back.
  const dead = { ...ogre, hpCurrent: 0, tempHP: 0, activeConditions: ['dead'], isDead: true };
  assert.deepEqual(applyMonsterVitalCommand(dead, { type: 'modifyHp', delta: 100 }), {
    ...dead, hpCurrent: 59, activeConditions: [], isDead: false,
  });
});

test('temporary and maximum hit points change only what they touch', () => {
  const ogre = { hpCurrent: 50, hpMax: 59 };
  assert.deepEqual(monsterVitalsPatch(ogre, applyMonsterVitalCommand(ogre, { type: 'setTempHp', value: 7 })), { tempHP: 7 });
  // Lowering the maximum lowers current HP; raising it heals nothing. The
  // change is kept as a bonus, as the builder does.
  assert.deepEqual(monsterVitalsPatch(ogre, applyMonsterVitalCommand(ogre, { type: 'setMaxHp', value: 40 })), {
    hpMax: 40, hpCurrent: 40, maxHPBonus: -19,
  });
  assert.deepEqual(monsterVitalsPatch(ogre, applyMonsterVitalCommand(ogre, { type: 'setMaxHp', value: 70 })), {
    hpMax: 70, maxHPBonus: 11,
  });
  // A piece that had no hit points starts whole.
  assert.deepEqual(applyMonsterVitalCommand({ hpCurrent: null, hpMax: null }, { type: 'setMaxHp', value: 12 }), {
    hpCurrent: 12, hpMax: 12, maxHPBonus: 0,
  });
});

test('the GM overlay carries temporary hit points from either private source', () => {
  const fights = { 77: { instance_id: 'enc_a', fight: { combatants: [{ id: 0, type: 'monster', hpCurrent: 12, hpMax: 59, tempHP: 4 }] } } };
  const [linked, loose] = withGmTokenVitals([
    { id: 'ogre', sourceRef: 'enc_a:77:0' },
    { id: 'mimic' },
  ], { fights, byToken: { mimic: { hpCurrent: 40, hpMax: 40, tempHp: 3 } } });
  assert.deepEqual([linked.hpCurrent, linked.tempHp], [12, 4]);
  assert.deepEqual([loose.hpCurrent, loose.tempHp], [40, 3]);
});

test('stepping a creature: temporary HP, and a maximum moved by an amount', () => {
  const ogre = { hpCurrent: 50, hpMax: 59, tempHP: 2, maxHPBonus: 0 };
  assert.deepEqual(monsterVitalsPatch(ogre, applyMonsterVitalCommand(ogre, { type: 'modifyTempHp', delta: -5 })), { tempHP: 0 });
  assert.deepEqual(monsterVitalsPatch(ogre, applyMonsterVitalCommand(ogre, { type: 'modifyMaxHp', delta: -10 })), {
    hpMax: 49, hpCurrent: 49, maxHPBonus: -10,
  });
  assert.deepEqual(monsterVitalsPatch(ogre, applyMonsterVitalCommand(ogre, { type: 'modifyMaxHp', delta: 5 })), {
    hpMax: 64, maxHPBonus: 5,
  });
});
