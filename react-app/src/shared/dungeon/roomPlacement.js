// What a rolled room puts on the board, and where.
//
// Two layers, for two different reasons. Creatures go on the piece layer, where
// every other creature lives: a monster is a thing the table moves and fights,
// and one the GM has to drag down a layer first is a step between the door
// opening and initiative. What keeps them unseen until then is the fog, which
// is the thing built for it.
//
// Traps, hazards and hoards go on the GM's layer and stay there. A trap the
// players can read off the board is not a trap, and a hoard they can count
// before they find it is not a discovery.

import { layoutTokens, monsterGroupTokens } from '../vtt/encounterImport.js';

export const CREATURE_LAYER = 'tokens';
export const MARKER_LAYER = 'gm';

// Told apart at a glance on a board that is otherwise creatures.
export const MARKER_COLORS = Object.freeze({
  trap: '#c04040',
  hazard: '#d69245',
  loot: '#e8a030',
});

export function roomTokens({
  room, groups = [], markers = [], origin = { col: 0, row: 0 },
}) {
  if (!room) return [];

  const creatures = groups.flatMap(({ monster, count }) => (
    monsterGroupTokens(monster, count, { layer: CREATURE_LAYER })
  ));
  const props = markers.map((marker) => ({
    layer: MARKER_LAYER,
    iconKey: marker.iconKey,
    label: marker.label,
    color: MARKER_COLORS[marker.kind] || MARKER_COLORS.trap,
    w: 1,
    h: 1,
  }));
  if (!creatures.length && !props.length) return [];

  // Laid out from the room's own corner and kept a column short of its far
  // wall, so a creature two squares wide does not hang through the stone.
  return layoutTokens([...creatures, ...props], [], {
    columns: Math.max(1, room.w - 1),
    origin: { x: origin.col + room.x, y: origin.row + room.y },
  });
}
