import { Box, Button, Stack, Typography } from '@mui/material';
import PiecePreview, { beginPiecePointerDrag } from './PiecePreview.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ONE_LINE_SX } from '../../../shared/ui/textStyles.js';
import { DRAG_SOURCE_SX } from '../../../shared/ui/interactive.js';

// The campaign's characters, each ready to go on the board: dragged out by
// its piece, or placed with the button (and taken off again). The GM's roster
// lists everyone, a player's panel only their own; the rows are the same.
export default function RosterCharacterList({
  roster,
  portraits,
  placed,
  busy,
  placementDisabled,
  onPlaceCharacter,
  onRemoveCharacter,
  onPlacementDragStart,
  onPlacementDragEnd,
}) {
  return (
    <Stack spacing={0.5}>
      {roster.map((entry) => {
        const isPlaced = placed.has(entry.characterId);
        const piece = {
          characterId: entry.characterId,
          label: entry.name,
          color: entry.color,
          className: entry.className,
          imageUrl: portraits[entry.portraitPath] || null,
        };
        const placement = {
          kind: 'character',
          characterId: entry.characterId,
          token: { ...piece, deathSaves: entry.deathSaves, layer: 'tokens', w: 1, h: 1 },
        };
        const draggable = !isPlaced && !placementDisabled && !busy;
        return (
          <Box
            key={entry.characterId}
            onPointerDown={(event) => {
              if (!draggable) return;
              beginPiecePointerDrag(event, placement, { onPlacementDragStart, onPlacementDragEnd });
            }}
            sx={[rowSx, !draggable && { cursor: 'default' }]}
          >
            <PiecePreview token={piece} />
            <Typography sx={nameSx}>{entry.name}</Typography>
            <Button
              size="small"
              variant={isPlaced ? 'text' : 'outlined'}
              disabled={busy || (!isPlaced && placementDisabled)}
              onClick={() => (isPlaced ? onRemoveCharacter?.(entry) : onPlaceCharacter(entry))}
            >
              {isPlaced ? 'Remove' : 'Place'}
            </Button>
          </Box>
        );
      })}
    </Stack>
  );
}

const rowSx = {
  ...DRAG_SOURCE_SX,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  py: 0.25,
};

const nameSx = {
  ...ONE_LINE_SX,
  flex: 1,
  fontSize: FONT_SIZES.xxl,
};
