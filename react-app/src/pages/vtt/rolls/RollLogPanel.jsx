import { Box, Button, Stack, Typography } from '@mui/material';
import { Trash2 } from 'lucide-react';
import RollCalculation from '../../../shared/character/dice/RollCalculation.jsx';
import RollActorLabel from '../../../shared/character/dice/RollActorLabel.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';

// Everything the table has rolled since this page was opened, newest first.
// Rolling from the map (the GM has no sheet; a player's may be in another tab)
// is the dice half of RollsButton.
//
// No persistence, and the panel says so: a roll is something that was said, and
// a log that survived a reload would invite people to treat it as a record of
// the session — which it is not, since it only ever held what arrived while
// somebody had the map open.
export default function RollLogPanel({ feed, onClear }) {
  return (
    <Stack spacing={0.75}>
      {onClear && feed?.length ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Trash2 size={14} />}
          onClick={onClear}
          sx={{ alignSelf: 'flex-end', color: 'text.secondary' }}
        >
          Clear
        </Button>
      ) : null}

      {!feed?.length ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Nothing rolled yet. Rolls made on a character sheet in this campaign show up here.
        </Typography>
      ) : (
        feed.map((roll) => <RollRow key={roll.id} roll={roll} />)
      )}

      {feed?.length ? (
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          Kept in memory only — this list is gone on reload.
        </Typography>
      ) : null}
    </Stack>
  );
}

function RollRow({ roll }) {
  return (
    <Box sx={rowSx}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
        <RollActorLabel entry={roll} />
        <Typography sx={labelSx}>{roll.label}</Typography>
        {roll.visibility === 'gm' ? <Typography sx={tagSx}>GM only</Typography> : null}
      </Stack>
      <RollCalculation entry={roll} />
      {roll.note ? <Typography sx={detailSx}>{roll.note}</Typography> : null}
    </Box>
  );
}

const rowSx = {
  px: 0.75,
  py: 0.5,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: vttAlpha(VTT_COLORS.white, 0.02),
};

const labelSx = { fontSize: '0.66rem', color: 'text.secondary', minWidth: 0 };
const tagSx = { fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.06em' };

const detailSx = { fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.35 };
