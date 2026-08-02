import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { MapPin, Plus } from 'lucide-react';
import { placedCharacterIds } from '../../../shared/campaign/roster.js';

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
  onAddMarker,
}) {
  const placed = placedCharacterIds(tokens);
  const mine = (roster || []).filter((entry) => ownedCharacterIds.includes(entry.characterId));

  return (
    <Paper sx={{ p: 0, bgcolor: 'transparent', boxShadow: 'none' }}>
      <Stack spacing={1.25}>
        {mine.length ? (
          <Stack spacing={0.5}>
            {mine.map((entry) => {
              const isPlaced = placed.has(entry.characterId);
              return (
                <Box
                  key={entry.characterId}
                  draggable={!isPlaced && !busy}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-gb-character', entry.characterId);
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                  sx={{ ...rowSx, cursor: isPlaced ? 'default' : 'grab' }}
                >
                  <Box sx={{ ...dotSx, bgcolor: entry.color || 'secondary.main' }} />
                  <Typography sx={nameSx}>{entry.name}</Typography>
                  <Button
                    size="small"
                    variant={isPlaced ? 'text' : 'outlined'}
                    disabled={isPlaced || busy}
                    onClick={() => onPlaceCharacter(entry)}
                  >
                    {isPlaced ? 'On map' : 'Place'}
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
          disabled={busy}
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
    </Paper>
  );
}

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  py: 0.25,
};

const dotSx = {
  width: 14,
  height: 14,
  borderRadius: '50%',
  border: '1px solid rgba(0,0,0,0.5)',
  flexShrink: 0,
};

const nameSx = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.85rem',
};
