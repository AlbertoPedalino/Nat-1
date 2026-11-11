import { asArray } from '../lists.js';
import { matchKey } from './nameKeys.js';

// Named blocks of 5etools entries (`{ name, entries }`), looked up by name the
// one way: depth-first through `entries` and `items`.
const isNamedBlock = (node) => Boolean(node && typeof node === 'object' && node.name && Array.isArray(node.entries));
const childLists = (node) => (node && typeof node === 'object' ? [node.entries, node.items].filter(Array.isArray) : []);

// The first block called `name` (Great Weapon Master -> "Hew"), or null.
export function findNamedEntry(entries, name) {
  const wanted = matchKey(name);
  if (!wanted) return null;
  const walk = (list) => {
    for (const node of asArray(list)) {
      if (isNamedBlock(node) && matchKey(node.name) === wanted) return node;
      for (const child of childLists(node)) {
        const found = walk(child);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(entries);
}

// The entries with the block called `name` alone among the named blocks beside
// it, the text around them kept: a card about one option of a feature shows
// that option (Runic Power: Frost). Null when there is no such block.
export function withOnlyNamedEntry(entries, name) {
  const wanted = matchKey(name);
  if (!wanted || !Array.isArray(entries)) return null;
  if (entries.some((node) => isNamedBlock(node) && matchKey(node.name) === wanted)) {
    return entries.filter((node) => !isNamedBlock(node) || matchKey(node.name) === wanted);
  }
  for (let index = 0; index < entries.length; index += 1) {
    const node = entries[index];
    for (const field of ['entries', 'items']) {
      const inner = node && typeof node === 'object' ? withOnlyNamedEntry(node[field], name) : null;
      if (inner) return [...entries.slice(0, index), { ...node, [field]: inner }, ...entries.slice(index + 1)];
    }
  }
  return null;
}

export function partitionNamedEntries(entries) {
  const list = entries == null ? [] : asArray(entries);
  const introEntries = [];
  const namedEntries = [];

  list.forEach((entry) => {
    if (entry && typeof entry === 'object' && entry.name) namedEntries.push(entry);
    else introEntries.push(entry);
  });

  return { introEntries, namedEntries };
}

export function splitNamedEntries(entries, introLabel = 'Description') {
  const { introEntries, namedEntries } = partitionNamedEntries(entries);
  return [
    ...(introEntries.length ? [{ name: introLabel, entries: introEntries }] : []),
    ...namedEntries,
  ];
}
