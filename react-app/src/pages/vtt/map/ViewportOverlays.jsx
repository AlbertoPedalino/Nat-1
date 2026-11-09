import { Box } from '@mui/material';
import { MapPin } from 'lucide-react';
import { tokenWorldRect, worldToScreen } from '../../../shared/vtt/map/geometry.js';
import { hexToWorld, hexWidth, isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import TokenSprite from '../tokens/TokenSprite.jsx';
import { distanceSx, placementCountSx } from './sceneViewportStyles.js';
import { clamp } from '../../../shared/numbers.js';

// Markers drawn over the board at screen positions, none of them interactive.

// The piece being dragged in from outside, at grid scale under the pointer.
export function PlacementPreview({
  placementDrag, placementHover, grid, view, fogOnTop, conditionEntries,
}) {
  const token = { ...placementDrag.token, ...placementHover };
  const rect = tokenWorldRect(token, grid);
  const at = worldToScreen(rect, view);
  return (
    <Box
      data-placement-preview
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: rect.width * view.zoom,
        height: rect.height * view.zoom,
        transform: `translate(${at.x}px, ${at.y}px)`,
        opacity: 0.88,
        pointerEvents: 'none',
        zIndex: fogOnTop ? 3 : 5,
        filter: `drop-shadow(0 5px 8px ${vttAlpha(VTT_COLORS.black, 0.75)})`,
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
  return (
    <Box
      aria-hidden
      data-party-hex={`${partyHex.q},${partyHex.r}`}
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        // The pin points at the hex, so it hangs above the centre rather
        // than sitting on it.
        transform: `translate(${centre.x}px, ${centre.y}px) translate(-50%, -78%)`,
        pointerEvents: 'none',
        color: VTT_COLORS.gold,
        filter: `drop-shadow(0 2px 4px ${vttAlpha(VTT_COLORS.black, 0.85)})`,
        zIndex: fogOnTop ? 3 : 5,
      }}
    >
      <MapPin size={glyph} fill={vttAlpha(VTT_COLORS.surfaceRaised, 0.85)} strokeWidth={2} />
    </Box>
  );
}

// What the brush is about to touch. Guessing the reach of a fog brush from its
// number alone is the fastest way to reveal a room you meant to keep dark.
export function BrushPreview({ mode, point, radius }) {
  return (
    <Box
      data-brush-preview={mode}
      aria-hidden
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: radius * 2,
        height: radius * 2,
        transform: `translate(${point.x - radius}px, ${point.y - radius}px)`,
        borderRadius: '50%',
        border: `1px solid ${vttAlpha(VTT_COLORS.white, 0.85)}`,
        boxShadow: `0 0 0 1px ${vttAlpha(VTT_COLORS.black, 0.6)} inset`,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  );
}

// How far the piece in hand has travelled. Outside the token nodes: they clip
// to a circle, and the badge has to sit clear of the piece to stay readable.
export function DistanceBadge({ measured, fogOnTop }) {
  return (
    <Box
      sx={{
        ...distanceSx,
        // `measured.x` is the token centre. Offset by half the badge's own
        // width, not by a fixed rem value: "5 ft" and "120 ft" must both
        // remain centred over the piece.
        transform: `translate(${measured.x}px, ${measured.y}px) translateX(-50%)`,
        zIndex: fogOnTop ? 3 : undefined,
      }}
    >
      {measured.label}
    </Box>
  );
}
