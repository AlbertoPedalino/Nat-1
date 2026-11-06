import { tokenWorldRect, worldToScreen } from '../../../shared/vtt/map/geometry.js';
import { hexHeight, hexToWorld, isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import HexBubble from '../hexcrawl/HexBubble.jsx';
import RollBubble from '../rolls/RollBubble.jsx';
import DiceTray from '../rolls/DiceTray.jsx';
import { PartyHexMarker } from './ViewportOverlays.jsx';

// What is said or thrown at the table, placed over the piece or hex it belongs
// to: dice throws, the party's hex, the hexcrawl's answer and roll bubbles.
// Positions are recomputed every render rather than stored, so each follows
// its piece or hex while the map is panned.
export default function ViewportCallouts({
  hostRef,
  grid,
  view,
  backgroundOnly,
  fogOnTop,
  diceThrows,
  partyHex,
  hexBubble,
  onHexBubbleClose,
  rollBubbles,
  onRollBubbleDismiss,
}) {
  return (
    <>
      {/* Screen space, over everything: the dice are on the table, not on the
          map. A throw with no piece to land next to lands in the middle. */}
      <DiceTray
        centered={backgroundOnly}
        throws={(diceThrows || []).map(({ roll, token }) => {
          const rect = !backgroundOnly && token ? tokenWorldRect(token, grid) : null;
          const at = rect ? worldToScreen(rect, view) : null;
          return {
            roll,
            dice: roll.rolls || [],
            x: at ? at.x + (rect.width * view.zoom) / 2 : (hostRef.current?.clientWidth || 0) / 2,
            // Below the piece, where the bubble is not.
            y: at ? at.y + rect.height * view.zoom + 18 : (hostRef.current?.clientHeight || 0) / 2,
          };
        })}
      />

      {!backgroundOnly && partyHex && isHexGrid(grid) ? (
        <PartyHexMarker partyHex={partyHex} grid={grid} view={view} fogOnTop={fogOnTop} />
      ) : null}

      {hexBubble && !backgroundOnly ? (() => {
        const centre = worldToScreen(hexToWorld(hexBubble.hex, grid), view);
        return (
          <HexBubble
            bubble={hexBubble}
            x={centre.x}
            // Clear of the hex itself: half its height, plus the tail.
            y={centre.y - (hexHeight(grid) * view.zoom) / 2 - 4}
            onClose={onHexBubbleClose}
          />
        );
      })() : null}

      {/* Over the piece that rolled. */}
      {!backgroundOnly && (rollBubbles || []).map(({ roll, token }) => {
        const rect = tokenWorldRect(token, grid);
        const at = worldToScreen(rect, view);
        return (
          <RollBubble
            key={roll.id}
            roll={roll}
            x={at.x + (rect.width * view.zoom) / 2}
            y={at.y - 6}
            underFog={fogOnTop}
            onDismiss={onRollBubbleDismiss}
          />
        );
      })}
    </>
  );
}
