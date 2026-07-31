import { rollDie, rollD8D12, rollD20D20 } from './rng.js';
import { getCompl, getEnc, getTrap, getEnvSev, getLoot } from './tables.js';
import { DUNGEON_ROOM_POP_LABELS } from './constants.js';

export const MIN_ROOM_COUNT = 1;
export const MAX_ROOM_COUNT = 40;

export function isValidRoomCount(value) {
  return Number.isInteger(value) && value >= MIN_ROOM_COUNT && value <= MAX_ROOM_COUNT;
}

export function roomCountInputFrom(results, fallback = '6') {
  const roomCount = results?.dungeon?.config?.roomCount;
  return isValidRoomCount(roomCount) ? String(roomCount) : fallback;
}

function buildRoom(index, { popMode, thr, tier }, tables, rng) {
  const roomThr = popMode === 'random' ? rollDie(3, rng) : thr;
  const popLabel = DUNGEON_ROOM_POP_LABELS[roomThr] || 'Unexplored';

  const slots = [];
  for (let s = 0; s < roomThr; s += 1) {
    const compRoll = rollD8D12(rng);
    const comp = getCompl(tables, compRoll.sum);
    let extra = null;
    if (comp.type === 'Encounter') {
      const encRoll = rollD20D20(rng);
      extra = { kind: 'enc', d1: encRoll.d1, d2: encRoll.d2, sum: encRoll.sum, data: getEnc(tables, tier, encRoll.sum) };
    } else if (comp.type === 'Environment Damage') {
      const trapRoll = rollD8D12(rng);
      extra = { kind: 'trap', d8: trapRoll.d8, d12: trapRoll.d12, sum: trapRoll.sum, data: getTrap(tables, tier, trapRoll.sum) };
    } else if (comp.type === 'Environment') {
      const envRoll = rollD8D12(rng);
      extra = { kind: 'env', d8: envRoll.d8, d12: envRoll.d12, sum: envRoll.sum, data: getEnvSev(tables, envRoll.sum) };
    }
    slots.push({ n: s + 1, thr: roomThr, d8: compRoll.d8, d12: compRoll.d12, sum: compRoll.sum, type: comp.type, extra });
  }

  const lootRoll = rollD8D12(rng);
  const lootData = getLoot(tables, lootRoll.sum);
  let lootDc = null;
  if (lootData.tipo !== 'Nothing found') {
    const dcRoll = rollD8D12(rng);
    lootDc = { d8: dcRoll.d8, d12: dcRoll.d12, sum: dcRoll.sum };
  }

  return {
    id: `room_${index}`,
    index,
    thr: roomThr,
    popLabel,
    slots,
    loot: { d8: lootRoll.d8, d12: lootRoll.d12, sum: lootRoll.sum, data: lootData },
    lootDc,
  };
}

export function createDungeon(config, tables, rng = Math.random, now = Date.now) {
  const rooms = [];
  for (let i = 1; i <= config.roomCount; i += 1) {
    rooms.push(buildRoom(i, config, tables, rng));
  }
  const createdAt = now();
  return {
    id: `dungeon_${createdAt.toString(36)}`,
    createdAt,
    config: { roomCount: config.roomCount, popMode: config.popMode, thr: config.thr, tier: config.tier },
    rooms,
  };
}
