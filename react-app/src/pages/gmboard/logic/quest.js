import { rollDie, rollD8D12, rollD20D20 } from './rng.js';
import { getEvent, getEnc, getLoot } from './tables.js';

const MINIMUM_REWARD_ROLL = 15;

function buildQuest(index, { tier }, tables, rng) {
  const evRoll = rollD20D20(rng);
  const ev = getEvent(tables, evRoll.sum);

  let encounter = null;
  if (ev.type === 'encounter' || ev.type === 'camp_nemico') {
    const encRoll = rollD20D20(rng);
    encounter = { d1: encRoll.d1, d2: encRoll.d2, sum: encRoll.sum, data: getEnc(tables, tier, encRoll.sum) };
  }

  const lootRoll = rollD8D12(rng);
  let lootData = getLoot(tables, lootRoll.sum);
  let isMinimum = false;
  if (lootData.tipo === 'Nothing found') {
    lootData = getLoot(tables, MINIMUM_REWARD_ROLL);
    isMinimum = true;
  }

  return {
    id: `quest_${index}`,
    index,
    event: { name: ev.name, type: ev.type, d1: evRoll.d1, d2: evRoll.d2, sum: evRoll.sum },
    encounter,
    reward: { d8: lootRoll.d8, d12: lootRoll.d12, sum: lootRoll.sum, isMinimum, data: lootData },
  };
}

export function createQuests(config, tables, rng = Math.random, now = Date.now) {
  const numDice = config.scope === 'random' ? rollDie(3, rng) : config.thr;
  const rolls = Array.from({ length: numDice }, () => rollDie(8, rng));
  const count = Math.max(...rolls);

  const quests = [];
  for (let i = 1; i <= count; i += 1) {
    quests.push(buildQuest(i, config, tables, rng));
  }

  const createdAt = now();
  return {
    id: `questset_${createdAt.toString(36)}`,
    createdAt,
    config: { scope: config.scope, thr: config.thr, tier: config.tier },
    numDice,
    rolls,
    count,
    quests,
  };
}
