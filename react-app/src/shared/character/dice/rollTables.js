import { loadGameData } from '../../content/gameData.js';
import { stripMarkup } from '../../content/markupText.js';
import { rollDie } from './dice.js';

// Tables a feature rolls on (Wild Magic Surge), read from the 5etools data
// like every other piece of game text: where the table lives, never its rows.
const TABLE_SOURCES = {
  wildMagicSurge: {
    file: 'class/class-sorcerer.json',
    list: 'subclassFeature',
    name: 'Wild Magic Surge',
    source: 'XPHB',
  },
};

const loaded = new Map();

function findTable(node) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findTable(child);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'table') return node;
  return findTable(node.entries || node.items || null);
}

// "01–04" → [1, 4]; "00" is 100, as printed on a d100 table.
function rangeBounds(text) {
  const numbers = String(text || '').match(/\d+/g) || [];
  const values = numbers.map((value) => (Number(value) === 0 ? 100 : Number(value)));
  return values.length ? [values[0], values[values.length - 1]] : null;
}

// A 5etools roll table as { name, sides, rows: [{ low, high, range, effect }] }.
export function parseRollTable(name, table) {
  const sides = Number(String(table?.colLabels?.[0] || '').match(/d(\d+)/)?.[1]) || null;
  const rows = (table?.rows || []).map(([range, effect]) => {
    const bounds = rangeBounds(range);
    return bounds && { low: bounds[0], high: bounds[1], range: String(range), effect: stripMarkup(effect) };
  }).filter(Boolean);
  return sides && rows.length ? { name: `${table.caption || name} Table`, sides, rows } : null;
}

// The table for a key, loaded once (a failed load is tried again next time).
export function loadRollTable(key) {
  const source = TABLE_SOURCES[key];
  if (!source) return Promise.resolve(null);
  if (!loaded.has(key)) {
    const promise = loadGameData(source.file).then((data) => {
      const feature = (data?.[source.list] || []).find((entry) => entry.name === source.name && entry.source === source.source);
      const table = parseRollTable(source.name, findTable(feature?.entries));
      if (!table) throw new Error(`No ${source.name} table in ${source.file}`);
      return table;
    });
    promise.catch(() => loaded.delete(key));
    loaded.set(key, promise);
  }
  return loaded.get(key);
}

export function rollOnTable(table, { count = 1, rng = Math.random } = {}) {
  const rolls = Array.from({ length: count }, () => {
    const value = rollDie(table.sides, rng);
    const row = table.rows.find((entry) => value >= entry.low && value <= entry.high);
    return { value, range: row?.range || String(value), effect: row?.effect || '', faces: table.sides };
  });
  return { name: table.name, sides: table.sides, rolls };
}
