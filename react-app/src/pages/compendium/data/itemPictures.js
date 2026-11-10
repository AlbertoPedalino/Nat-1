// The pictures of the compendium's items, from 5etools' fluff file. Pure,
// testable in node; loadCompendium.js notes them on the item entries.

import { CORE_2024_SOURCE_PRIORITY, isAllowedSource } from '../../../shared/content/sourcePriority.js';
import { recordKey, splitNameSource } from '../../../shared/content/nameKeys.js';
import { resolveCopyRecords } from '../../../shared/content/copyRecords.js';

// The books pictures may come from: the supported 2024 manuals, never an
// earlier edition (user rule 2026-10-26).
export const PICTURE_SOURCES = Object.freeze([...CORE_2024_SOURCE_PRIORITY, 'XMM']);

// Item pictures from fluff-items.json: name|source -> address of the first
// image, following an entry that copies another's ({_copy: {name, source}}).
// Only records of `sources` are kept, so no lookup — direct, through a copy,
// a group or a base item — can reach a picture of an older edition.
export function itemImageMap(fluffJson, imageBase, { sources = PICTURE_SOURCES } = {}) {
  const records = resolveCopyRecords((fluffJson?.itemFluff || [])
    .filter((record) => isAllowedSource(record.source, sources)));
  const images = new Map();
  records.forEach((record) => {
    const path = record?.images?.find((image) => image?.href?.path)?.href?.path;
    if (path) images.set(recordKey(record.name, record.source), `${imageBase}${encodeURI(path.replace(/^\/+/, ''))}`);
  });
  return {
    get: (name, source) => images.get(recordKey(name, source)) || null,
    size: images.size,
  };
}

// The picture an item shows: its own; else its group's (5etools draws one belt
// for all six Belts of Giant Strength); else, for a magic variant of a base
// item (Longsword +1), the base item's. `groupOf(name, source)` names the
// group an item belongs to.
export function itemPicture(item, images, groupOf = () => null) {
  if (!images || !item?.name) return null;
  const own = images.get(item.name, item.source);
  if (own) return own;
  const group = groupOf(item.name, item.source);
  const fromGroup = group ? images.get(group.name, group.source) : null;
  if (fromGroup) return fromGroup;
  const { name: baseName, source: baseSource } = splitNameSource(item.baseItem);
  return baseName ? images.get(baseName, baseSource || 'XPHB') : null;
}

// Member name|source -> its group, from the items file's itemGroup list.
export function itemGroupLookup(groups) {
  const byMember = new Map();
  (groups || []).forEach((group) => {
    (group.items || []).forEach((ref) => {
      const { name, source } = splitNameSource(ref);
      byMember.set(recordKey(name, source || group.source), { name: group.name, source: group.source });
    });
  });
  return (name, source) => byMember.get(recordKey(name, source)) || null;
}
