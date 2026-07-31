import { getSurgeEffect } from './wildMagicSurgeTable.js';

const TABLES = {
  wildMagicSurge: {
    name: 'Wild Magic Surge Table',
    sides: 100,
    lookup: getSurgeEffect,
  },
};

export function getRollTable(key) {
  return TABLES[key] || null;
}

export function rollTable(key, { count = 1 } = {}) {
  const table = TABLES[key];
  if (!table) return null;
  const rolls = [];
  for (let i = 0; i < count; i += 1) {
    const value = Math.floor(Math.random() * table.sides) + 1;
    const entry = table.lookup ? table.lookup(value) : null;
    rolls.push({
      value,
      range: entry?.range || '',
      effect: entry?.effect || '',
      faces: table.sides,
    });
  }
  return { key, name: table.name, sides: table.sides, rolls };
}

export function registerRollTable(key, def) {
  if (!key || !def) return;
  TABLES[key] = def;
}
