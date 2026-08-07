// Which Encounter Builder a battle map belongs to.
//
// Nobody should have to pick it. The chain already exists and every link in it
// was made on purpose: the scene names its campaign, the campaign names the GM
// Board that keeps its clock and its tables, and that board sits in a link group
// with the other tools of the same table. The Encounter Builder in that group is
// the one whose fights this map's dungeon belongs in.
//
// Any link missing is not an error to shout about — a map may simply not be part
// of a set — so this answers with null and the panel says what to link.

import { readRegistry } from '../localStorageRegistries.js';
import { SECTION_REGISTRY } from '../sectionRegistry.js';
import { normalizeLinkGroupId } from '../linkGroupId.js';

function instancesOf(sectionKey) {
  const section = SECTION_REGISTRY[sectionKey];
  if (!section) return [];
  return readRegistry(section.registryKey).map((entry) => ({
    ...entry,
    linkGroupId: normalizeLinkGroupId(entry.linkGroupId),
  }));
}

export function linkGroupOfBoard(boardId) {
  if (!boardId) return null;
  const board = instancesOf('gmboard').find((entry) => entry.id === boardId);
  return board?.linkGroupId || null;
}

// The Encounter Builder of a link group, and only if there is exactly one: two
// would be a choice, and choosing one for the GM is how a fight ends up in a
// file they never open.
export function encountersInGroup(linkGroupId) {
  const group = normalizeLinkGroupId(linkGroupId);
  if (!group) return [];
  return instancesOf('encounters').filter((entry) => entry.linkGroupId === group);
}

export function encounterInstanceForBoard(boardId) {
  const group = linkGroupOfBoard(boardId);
  if (!group) return null;
  const found = encountersInGroup(group);
  return found.length === 1 ? found[0] : null;
}

// Why there is no instance, in the words of the thing the GM has to go and do.
export function missingLinkReason(boardId) {
  if (!boardId) return 'This campaign has no GM Board linked. Link one from the GM Board page.';
  const group = linkGroupOfBoard(boardId);
  if (!group) {
    return 'That GM Board is not linked to an Encounter Builder. Link them from the board\'s Linked tools menu.';
  }
  const found = encountersInGroup(group);
  if (!found.length) {
    return 'No Encounter Builder is linked to that GM Board. Link one from its Linked tools menu.';
  }
  return 'That GM Board is linked to more than one Encounter Builder, so there is no single place to send a fight.';
}
