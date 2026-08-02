import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { EyeOff, UserPlus } from 'lucide-react';
import { placedCharacterIds } from '../../../shared/campaign/roster.js';

// Player pieces come from the campaign roster, so the GM never types a party
// member's name by hand. Characters already on the map are shown as placed
// rather than hidden, otherwise the panel looks broken once everyone is down.
export default function RosterPanel({ roster, tokens, busy, onPlaceCharacter, onAddHiddenToken }) {
  const placed = placedCharacterIds(tokens);

  return (
    <Paper sx={{ p: 1.5, bgcolor: 'background.paper' }}>
      <Stack spacing={1.25}>
        <Typography variant="h2" sx={{ fontSize: '0.95rem' }}>Party</Typography>

        {!roster.length ? (
          <Typography variant="body2" color="text.secondary">
            No characters in this campaign yet.
          </Typography>
        ) : null}

        <Stack spacing={0.5}>
          {roster.map((entry) => {
            const isPlaced = placed.has(entry.characterId);
            return (
              <Box key={entry.characterId} sx={rowSx}>
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

        <Button
          size="small"
          variant="outlined"
          startIcon={<UserPlus size={15} />}
          disabled={busy}
          onClick={() => onAddHiddenToken('tokens')}
        >
          Add blank token
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="warning"
          startIcon={<EyeOff size={15} />}
          disabled={busy}
          onClick={() => onAddHiddenToken('gm')}
        >
          Add GM-only token
        </Button>
        <Typography variant="caption" color="text.secondary">
          GM-only pieces are filtered out by the database, not just hidden in the view.
        </Typography>
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
