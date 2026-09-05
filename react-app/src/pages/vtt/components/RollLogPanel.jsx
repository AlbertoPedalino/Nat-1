import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Dices, Trash2 } from 'lucide-react';
import CustomRollDialog from '../../../shared/character/CustomRollDialog.jsx';
import DieFace2D from '../../../shared/character/DieFace2D.jsx';
import { resolveToastLayout } from '../../../shared/character/rollToastLayout.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { fullscreenContainer } from '../logic/fullscreenContainer.js';
import {
  battleMapDialogActionsSx,
  battleMapDialogContentSx,
  battleMapDialogPaperSx,
  battleMapDialogTitleSx,
} from './battleMapSurface.js';

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
        feed.map((roll) => <RollRow key={roll.id} roll={roll} />)
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
        slotProps={{ paper: { sx: battleMapDialogPaperSx } }}
        titleSx={battleMapDialogTitleSx}
        contentSx={battleMapDialogContentSx}
        actionsSx={battleMapDialogActionsSx}
      />
    </Stack>
  );
}

function RollRow({ roll }) {
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
        {roll.visibility === 'gm' ? <Typography sx={tagSx}>GM only</Typography> : null}
        {layout.modeChip ? (
          <Typography sx={{ ...tagSx, color: layout.modeChip.color }}>{layout.modeChip.label}</Typography>
        ) : null}
        <Box sx={{ flex: 1 }} />
        {layout.total == null ? null : (
          <Typography sx={{ ...totalSx, color: layout.totalColor }}>{layout.total}</Typography>
        )}
      </Stack>
      <StaticDiceRow dice={layout.dice} modifier={layout.modifier} />
      {roll.detail ? <Typography sx={detailSx}>{roll.detail}</Typography> : null}
      {roll.note ? <Typography sx={detailSx}>{roll.note}</Typography> : null}
    </Box>
  );
}

function StaticDiceRow({ dice, modifier }) {
  if (!dice?.length && !modifier) return null;
  return (
    <Box sx={diceRowSx}>
      {(dice || []).map((die, index) => (
        <DieFace2D
          key={`${die.faces}:${index}`}
          value={die.value}
          faces={die.faces}
          color={die.color}
          dimmed={die.dimmed}
          size={34}
        />
      ))}
      {modifier ? <Typography sx={modifierSx}>{modifier}</Typography> : null}
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

const actorSx = {
  fontSize: '0.66rem',
  fontWeight: 700,
  color: VTT_COLORS.gold,
  whiteSpace: 'nowrap',
};

const labelSx = { fontSize: '0.66rem', color: 'text.secondary', minWidth: 0 };
const tagSx = { fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.06em' };

const totalSx = {
  fontSize: '0.82rem',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
};

const detailSx = { fontSize: '0.6rem', color: VTT_COLORS.rollDetail, lineHeight: 1.35 };

const diceRowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.4,
  my: 0.4,
  alignItems: 'center',
};

const modifierSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: 'text.secondary',
  ml: 0.3,
};
