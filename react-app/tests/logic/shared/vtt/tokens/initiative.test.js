import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sceneFightChoices,
  showsFight,
  toSceneTurns,
  turnBase,
  turnEntriesFromFight,
  turnEntriesFromTokens,
} from '../../../../../src/shared/vtt/tokens/initiative.js';

const turns = { sceneId: 's1', instanceId: 'inst', fightId: '77', round: 2 };

test('the scene row and the base a step is checked against', () => {
  assert.deepEqual(
    toSceneTurns({ scene_id: 's1', instance_id: 'inst', fight_id: '77', round: 2 }),
    turns,
  );
  assert.equal(toSceneTurns(null), null);
  assert.equal(showsFight(toSceneTurns({ scene_id: 's1', instance_id: null, fight_id: null, round: null })), false);
  assert.equal(showsFight(turns), true);
  assert.deepEqual(turnBase({ currentTurn: 2, round: 3, turnRevision: 5 }), { currentTurn: 2, round: 3, turnRevision: 5 });
  assert.deepEqual(turnBase({}), { currentTurn: 0, round: 1, turnRevision: 0 }, 'a fight saved before turn revisions');
});

test('players build the order from the pieces they can see, one entry per slot', () => {
  const entries = turnEntriesFromTokens([
    { id: 't3', label: 'Hero', turnOrder: 3, turnActive: false, characterId: 'pc' },
    { id: 't1', label: 'Goblin A', turnOrder: 1, turnActive: true, conditions: ['dead'] },
    { id: 't1b', label: 'Goblin A (copy)', turnOrder: 1, turnActive: true },
    { id: 'tx', label: 'Torch', turnOrder: null },
  ]);
  assert.deepEqual(entries.map((entry) => [entry.order, entry.name, entry.active, entry.dead]), [
    [1, 'Goblin A', true, true],
    [3, 'Hero', false, false],
  ]);
});

test('the GM sees every combatant, marked when the table does not', () => {
  const fightRow = {
    id: '77',
    instance_id: 'inst',
    fight: {
      currentTurn: 1,
      round: 2,
      combatants: [
        { id: 0, name: 'Goblin', label: 'A', type: 'monster' },
        { id: 1, name: 'Goblin', label: 'B', type: 'monster' },
        { id: 2, name: 'Boss', type: 'monster', isDead: true },
        { id: 3, name: 'Hero', type: 'player', sourceId: 'pc' },
      ],
    },
  };
  const tokens = [
    { id: 'a', label: 'Goblin A', sourceRef: 'inst:77:0', layer: 'tokens' },
    { id: 'b', label: 'Goblin B', sourceRef: 'inst:77:1', layer: 'gm', hiddenFromPlayers: true },
    { id: 'other', label: 'Old goblin', sourceRef: 'inst:12:2', layer: 'tokens' },
    { id: 'h', label: 'Hero', characterId: 'pc', layer: 'tokens' },
  ];
  const entries = turnEntriesFromFight(fightRow, tokens, turns);
  assert.deepEqual(entries.map((entry) => [entry.name, entry.active, entry.onBoard, entry.hiddenFromPlayers, entry.dead]), [
    ['Goblin A', false, true, false, false],
    ['Goblin B', true, true, true, false],
    ['Boss', false, false, true, true],
    ['Hero', false, true, false, false],
  ]);
  assert.deepEqual(turnEntriesFromFight(fightRow, tokens, { ...turns, fightId: null }), [], 'nothing shown');
});

test('fight choices come from the imported pieces, newest first', () => {
  const tokens = [
    { id: 'a', sourceRef: 'inst:77:0' },
    { id: 'b', sourceRef: 'inst:77:1' },
    { id: 'c', sourceRef: 'inst:12:0' },
    { id: 'd', sourceRef: 'elsewhere:99:0' },
    { id: 'e', sourceRef: 'inst:404:0' }, // its encounter was deleted
    { id: 'h', characterId: 'pc', turnActive: true },
  ];
  const fights = {
    77: { id: '77', instance_id: 'inst', name: 'Ambush', updated_at: '2026-10-24T10:00:00Z' },
    12: { id: '12', instance_id: 'inst', name: 'Bridge', updated_at: '2026-10-20T10:00:00Z' },
    99: { id: '99', instance_id: 'not-elsewhere', name: 'Wrong', updated_at: '2026-10-25T10:00:00Z' },
  };
  assert.deepEqual(sceneFightChoices(tokens, fights).map((choice) => [choice.fightId, choice.name]), [
    ['77', 'Ambush'],
    ['12', 'Bridge'],
  ]);
});
