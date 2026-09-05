import { Box, Button, Stack, Typography } from '@mui/material';
import { MapPin, Plus } from 'lucide-react';
import { placedCharacterIds } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/usePortraits.js';
import PiecePreview, { beginPiecePointerDrag } from './PiecePreview.jsx';

// What a player can do to the board. Deliberately short: place their own
// character, drop a plain marker, and move or pick up either. Everything else on
// the map belongs to the GM, and the database says so too — this panel only
// stops them being offered a write that would be refused.
export default function PlayerPanel({
  roster,
  tokens,
  ownedCharacterIds,
  busy,
  onPlaceCharacter,
  onRemoveCharacter,
  onAddMarker,
  onPlacementDragStart,
  onPlacementDragEnd,
  placementDisabled = false,
}) {
  const placed = placedCharacterIds(tokens);
  const mine = (roster || []).filter((entry) => ownedCharacterIds.includes(entry.characterId));
  const portraits = usePortraits(mine.map((entry) => entry.portraitPath));

  return (
    <Box sx={panelInnerSx}>
      <Stack spacing={1.25}>
        {mine.length ? (
          <Stack spacing={0.5}>
            {mine.map((entry) => {
              const isPlaced = placed.has(entry.characterId);
              const placement = {
                kind: 'character',
                characterId: entry.characterId,
                token: {
                  characterId: entry.characterId,
                  label: entry.name,
                  color: entry.color,
                  className: entry.className,
                  deathSaves: entry.deathSaves,
                  imageUrl: portraits[entry.portraitPath] || null,
                  layer: 'tokens',
                  w: 1,
                  h: 1,
                },
              };
              return (
                <Box
                  key={entry.characterId}
                  onPointerDown={(event) => {
                    if (isPlaced || placementDisabled || busy) return;
                    beginPiecePointerDrag(event, placement, {
                      onPlacementDragStart,
                      onPlacementDragEnd,
                    });
                  }}
                  sx={{
                    ...rowSx,
                    cursor: isPlaced || placementDisabled || busy ? 'default' : 'grab',
                  }}
                >
                  <PiecePreview token={{
                    characterId: entry.characterId,
                    label: entry.name,
                    color: entry.color,
                    className: entry.className,
                    imageUrl: portraits[entry.portraitPath] || null,
                  }} />
                  <Typography sx={nameSx}>{entry.name}</Typography>
                  <Button
                    size="small"
                    variant={isPlaced ? 'text' : 'outlined'}
                    disabled={busy || (!isPlaced && placementDisabled)}
                    onClick={() => (isPlaced
                      ? onRemoveCharacter?.(entry)
                      : onPlaceCharacter(entry))}
                  >
                    {isPlaced ? 'Remove' : 'Place'}
                  </Button>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            None of your characters is attached to this campaign yet.
          </Typography>
        )}

        <Button
          size="small"
          variant="outlined"
          startIcon={<Plus size={15} />}
          disabled={placementDisabled || busy}
          onClick={onAddMarker}
        >
          Drop a marker
        </Button>

        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ color: 'text.secondary', mt: '2px' }}><MapPin size={13} /></Box>
          <Typography variant="caption" color="text.secondary">
            Right-click any creature to flag a condition on it — that works on enemies too.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  py: 0.25,
  touchAction: 'pan-y',
  WebkitTouchCallout: 'none',
  userSelect: 'none',
};

const panelInnerSx = { p: 0, bgcolor: 'transparent', backgroundImage: 'none' };

const nameSx = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.85rem',
};
