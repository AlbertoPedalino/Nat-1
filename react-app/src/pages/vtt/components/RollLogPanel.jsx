import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Dices, Trash2 } from 'lucide-react';
import CustomRollDialog from '../../../shared/character/CustomRollDialog.jsx';
import DiceRow from '../../../shared/character/DiceRow.jsx';
import { resolveToastLayout } from '../../../shared/character/rollToastLayout.js';
import { fullscreenContainer } from '../logic/fullscreenContainer.js';

// Everything the table has rolled since this page was opened, newest first,
// plus the same custom-dice picker the character sheets use — so the GM, who
// has no sheet, and a player whose sheet is in another tab can still roll to
// the table from here.
//
// No persistence, and the panel says so: a roll is something that was said, and
// a log that survived a reload would invite people to treat it as a record of
// the session — which it is not, since it only ever held what arrived while
// somebody had the map open.
export default function RollLogPanel({ feed, onCustomRoll, onClear }) {
  const [rollerOpen, setRollerOpen] = useState(false);

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={0.75}>
        {onCustomRoll ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<Dices size={14} />}
            onClick={() => setRollerOpen(true)}
            sx={{ flex: 1 }}
          >
            Custom Roll
          </Button>
        ) : null}
        {onClear && feed?.length ? (
          <Button
            size="small"
            variant="outlined"
            aria-label="Clear the roll log"
            onClick={onClear}
            sx={{ minWidth: 0, px: 1, color: 'text.secondary' }}
          >
            <Trash2 size={14} />
          </Button>
        ) : null}
      </Stack>

      {!feed?.length ? (
        <Typography variant="body2" color="text.secondary">
          Nothing rolled yet. Rolls made on a character sheet in this campaign show up here.
        </Typography>
      ) : (
        feed.map((roll, index) => <RollRow key={roll.id} roll={roll} solid={index < SOLID_ROWS} />)
      )}

      {feed?.length ? (
        <Typography variant="caption" color="text.disabled">
          Kept in memory only — this list is gone on reload.
        </Typography>
      ) : null}

      <CustomRollDialog
        open={rollerOpen}
        onClose={() => setRollerOpen(false)}
        onRoll={onCustomRoll}
        // The map is often fullscreen, and a dialog on the body is not painted
        // at all when it is.
        container={fullscreenContainer}
      />
    </Stack>
  );
}

// How many of the newest rolls draw their dice as full solids. A hundred-sided
// die is a hundred separately composited planes, and a log holding forty of
// them is what the page cannot afford — the rest keep the face they landed on.
const SOLID_ROWS = 6;

function RollRow({ roll, solid }) {
  const layout = resolveToastLayout({
    label: roll.label,
    detail: roll.detail,
    total: roll.total,
    rolls: roll.rolls,
    meta: { mode: roll.mode, bonus: roll.bonus },
  });

  return (
    <Box sx={rowSx}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
        <Typography sx={actorSx}>{roll.actorName || 'Someone'}</Typography>
        <Typography sx={labelSx}>{roll.label}</Typography>
        {layout.modeChip ? (
          <Typography sx={{ ...tagSx, color: layout.modeChip.color }}>{layout.modeChip.label}</Typography>
        ) : null}
        <Box sx={{ flex: 1 }} />
        {layout.total == null ? null : (
          <Typography sx={{ ...totalSx, color: layout.totalColor }}>{layout.total}</Typography>
        )}
      </Stack>
      {/* Only a row that has just arrived mounts its dice, so the throw plays
          once here and old entries sit still. */}
      <DiceRow dice={layout.dice} modifier={layout.modifier} size={36} seed={roll.id} solid={solid} />
      {roll.detail ? <Typography sx={detailSx}>{roll.detail}</Typography> : null}
    </Box>
  );
}

const rowSx = {
  px: 0.75,
  py: 0.5,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'rgba(255,255,255,0.02)',
};

const actorSx = {
  fontSize: '0.66rem',
  fontWeight: 700,
  color: '#e8c96a',
  whiteSpace: 'nowrap',
};

const labelSx = { fontSize: '0.66rem', color: 'text.secondary', minWidth: 0 };
const tagSx = { fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.06em' };

const totalSx = {
  fontSize: '0.82rem',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
};

const detailSx = { fontSize: '0.6rem', color: '#8a7a5a', lineHeight: 1.35 };
