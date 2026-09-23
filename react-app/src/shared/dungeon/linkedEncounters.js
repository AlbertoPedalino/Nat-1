// Resolve an Encounter Builder from a tool group. Campaigns own their group
// directly; board-based helpers also serve callers with a local GM Board.

import { readRegistry } from '../storage/localStorageRegistries.js';
import { SECTION_REGISTRY } from '../instances/sectionRegistry.js';
import { normalizeLinkGroupId } from '../instances/linkGroupId.js';

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

// The same walk, over lists somebody else fetched.
//
// The registry above is this browser's. A GM who prepared on one machine and
// runs the game on another has none of it there, and the panel would say the map
// has no Encounter Builder linked while the link plainly exists — it is simply
// written in the cloud rather than in this localStorage. Both lists carry an id
// and a link group, which is all the walk ever needed.
export function pickEncounterInstance(boards, encounters, boardId) {
  if (!boardId) return null;
  const board = (boards || []).find((entry) => entry?.id === boardId);
  const group = normalizeLinkGroupId(board?.linkGroupId ?? board?.link_group_id);
  return pickEncounterInstanceInGroup(encounters, group);
}

// Campaigns keep this group independently of their hexcrawl board.
export function pickEncounterInstanceInGroup(encounters, linkGroupId) {
  const group = normalizeLinkGroupId(linkGroupId);
  if (!group) return null;
  const found = (encounters || []).filter((entry) => (
    normalizeLinkGroupId(entry?.linkGroupId ?? entry?.link_group_id) === group
  ));
  // Exactly one, for the reason above: choosing between two for the GM is how a
  // fight ends up in a file they never open.
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
