import { Box } from '@mui/material';
import { MapPin } from 'lucide-react';
import { tokenWorldRect, worldToScreen } from '../../../shared/vtt/map/geometry.js';
import { hexToWorld, hexWidth, isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import TokenSprite from '../tokens/TokenSprite.jsx';
import { distanceSx, placementCountSx } from './sceneViewportStyles.js';
import { clamp } from '../../../shared/numbers.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { useLiveStyle } from '../../../shared/ui/liveStyle.js';
import { hungOverStyle, pieceScreenStyle } from './viewportGeometry.js';

// Markers drawn over the board at screen positions, none of them interactive.

// The piece being dragged in from outside, at grid scale under the pointer.
export function PlacementPreview({
  placementDrag, placementHover, grid, view, fogOnTop, conditionEntries,
}) {
  const token = { ...placementDrag.token, ...placementHover };
  const rect = tokenWorldRect(token, grid);
  const at = worldToScreen(rect, view);
  const placeRef = useLiveStyle(pieceScreenStyle(rect, at, view.zoom));
  return (
    <Box
      ref={placeRef}
      data-placement-preview
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        opacity: OPACITY.veil,
        pointerEvents: 'none',
        zIndex: fogOnTop ? 3 : 5,
        filter: `drop-shadow(0 5px 8px ${vttAlpha(VTT_COLORS.black, OPACITY.heavy)})`,
      }}
    >
      <TokenSprite
        token={token}
        size="100%"
        hex={isHexGrid(grid)}
        interactive={false}
        movable={false}
        conditionEntries={conditionEntries}
      />
      {placementDrag.count > 1 ? <Box sx={placementCountSx}>×{placementDrag.count}</Box> : null}
    </Box>
  );
}

// Where the party stands. Drawn for everyone looking at the map — the players
// and the projector included — because a hexcrawl with no marker is a coloured
// map nobody can point at.
export function PartyHexMarker({
  partyHex, grid, view, fogOnTop,
}) {
  const centre = worldToScreen(hexToWorld(partyHex, grid), view);
  // Two thirds of the hex it stands in: the marker is read from across the
  // table, and a pin the size of a token label is not.
  const glyph = clamp(hexWidth(grid) * view.zoom * 0.66, 20, 96);
  // The pin points at the hex, so it hangs above the centre rather than
  // sitting on it.
  const placeRef = useLiveStyle(hungOverStyle(centre.x, centre.y, '-78%'));
  return (
    <Box
      ref={placeRef}
      aria-hidden
      data-party-hex={`${partyHex.q},${partyHex.r}`}
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        color: VTT_COLORS.accent,
        filter: `drop-shadow(0 2px 4px ${vttAlpha(VTT_COLORS.black, OPACITY.veil)})`,
        zIndex: fogOnTop ? 3 : 5,
      }}
    >
      <MapPin size={glyph} fill={vttAlpha(VTT_COLORS.surfaceRaised, OPACITY.veil)} strokeWidth={2} />
    </Box>
  );
}

// What the brush is about to touch. Guessing the reach of a fog brush from its
// number alone is the fastest way to reveal a room you meant to keep dark.
export function BrushPreview({ mode, point, radius }) {
  const placeRef = useLiveStyle({
    width: radius * 2,
    height: radius * 2,
    transform: `translate(${point.x - radius}px, ${point.y - radius}px)`,
  });
  return (
    <Box
      ref={placeRef}
      data-brush-preview={mode}
      aria-hidden
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        borderRadius: '50%',
        border: `1px solid ${vttAlpha(VTT_COLORS.white, OPACITY.veil)}`,
        boxShadow: `0 0 0 1px ${vttAlpha(VTT_COLORS.black, OPACITY.strong)} inset`,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  );
}

// How far the piece in hand has travelled. Outside the token nodes: they clip
// to a circle, and the badge has to sit clear of the piece to stay readable.
export function DistanceBadge({ measured, fogOnTop }) {
  // `measured.x` is the token centre. Offset by half the badge's own width,
  // not by a fixed rem value: "5 ft" and "120 ft" must both remain centred
  // over the piece.
  const placeRef = useLiveStyle({ transform: `translate(${measured.x}px, ${measured.y}px) translateX(-50%)` });
  return (
    <Box
      ref={placeRef}
      sx={{
        ...distanceSx,
        zIndex: fogOnTop ? 3 : undefined,
      }}
    >
      {measured.label}
    </Box>
  );
}
