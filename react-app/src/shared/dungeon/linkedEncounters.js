// Resolve an Encounter Builder from a tool group. Campaigns own their group
// directly; board-based helpers also serve callers with a local GM Board.

import { normalizeLinkGroupId } from '../instances/linkGroupId.js';

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
export function pickEncounterInstanceInGroup(encounters, linkGroupId, selectedId = null) {
  const group = normalizeLinkGroupId(linkGroupId);
  if (!group) return null;
  const found = (encounters || []).filter((entry) => (
    normalizeLinkGroupId(entry?.linkGroupId ?? entry?.link_group_id) === group
  ));
  // An explicit choice must still be linked. Never redirect a stale selection
  // silently to a different builder.
  if (selectedId) return found.find((entry) => entry.id === selectedId) || null;
  // Preserve automatic routing for campaigns with only one linked builder.
  return found.length === 1 ? found[0] : null;
}

