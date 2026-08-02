import { Box, Chip, Typography } from '@mui/material';
import { resolveToastLayout } from '../../../shared/character/rollToastLayout.js';
import DiceRow from '../../../shared/character/DiceRow.jsx';

const FONT = '"Cinzel", Georgia, serif';

// What somebody just rolled, over their piece. A speech bubble because that is
// what it is: a thing said at the table, not a record — it fades on its own and
// is never written anywhere.
//
// Laid out by the same function as the sheet's toast, so the player who rolled
// and the table watching the map read the same thing.
export default function RollBubble({ roll, x, y }) {
  const layout = resolveToastLayout({
    label: roll.label,
    detail: roll.detail,
    total: roll.total,
    rolls: roll.rolls,
    meta: { mode: roll.mode, bonus: roll.bonus },
  });

  return (
    // Outer box owns the position; the transform here must stay untouched, so
    // the entrance animation lives on the inner box instead.
    <Box sx={{ ...rootSx, transform: `translate(${x}px, ${y}px) translate(-50%, -100%)` }}>
      <Box sx={{
        ...bubbleSx,
        ...(layout.isCrit ? critSx : {}),
        ...(layout.isFail ? failSx : {}),
      }}>
        {roll.actorName ? <Typography sx={actorSx}>{roll.actorName}</Typography> : null}

        <Typography sx={labelSx}>{layout.label}</Typography>

        {layout.isCrit && <Typography sx={{ ...natSx, color: '#edd48a' }}>NATURAL 20!</Typography>}
        {layout.isFail && <Typography sx={{ ...natSx, color: '#de675f' }}>NATURAL 1</Typography>}

        {layout.modeChip && (
          <Chip size="small" label={layout.modeChip.label} variant="outlined" sx={modeChipSx(layout.modeChip)} />
        )}

        <DiceRow
          dice={layout.dice}
          modifier={layout.modifier}
          size={40}
          justify="center"
          seed={roll.id}
        />

        {layout.total != null && (
          <Typography sx={{
            ...totalSx,
            fontSize: (layout.isCrit || layout.isFail) ? '1.7rem' : '1.3rem',
            color: layout.totalColor,
          }}>
            {layout.total}
          </Typography>
        )}

        {/* A rest or a death-save guard has no total and no dice — the line the
            roller saw is the whole message. */}
        {layout.total == null && layout.dice.length === 0 && layout.detail && (
          <Typography sx={detailSx}>{layout.detail}</Typography>
        )}

        <Box sx={tailSx} />
      </Box>
    </Box>
  );
}

const rootSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  zIndex: 7,
  pointerEvents: 'none',
};

const bubbleSx = {
  position: 'relative',
  px: 1.2,
  py: 0.9,
  minWidth: 150,
  maxWidth: 260,
  textAlign: 'center',
  borderRadius: 2,
  bgcolor: 'rgba(26,23,19,0.97)',
  border: '2px solid',
  borderColor: 'divider',
  boxShadow: '0 8px 26px rgba(0,0,0,0.6)',
  // Grows out of the tail, which sits on the token — so the roll looks spoken by
  // the piece rather than dropped onto the map from somewhere off screen.
  transformOrigin: 'bottom center',
  animation: 'gbRollBubbleIn 220ms cubic-bezier(0.34, 1.4, 0.64, 1)',
  '@keyframes gbRollBubbleIn': {
    from: { opacity: 0, transform: 'scale(0.25)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
};

const critSx = {
  borderColor: '#edd48a',
  boxShadow: '0 8px 26px rgba(0,0,0,0.6), 0 0 18px rgba(237,212,138,0.28)',
};

const failSx = {
  borderColor: '#de675f',
  boxShadow: '0 8px 26px rgba(0,0,0,0.6), 0 0 18px rgba(222,103,95,0.28)',
};

const actorSx = {
  fontFamily: FONT,
  fontSize: '0.6rem',
  fontWeight: 700,
  color: '#e8c96a',
  lineHeight: 1.2,
};

const labelSx = {
  fontFamily: FONT,
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  mb: 0.3,
};

const natSx = {
  fontFamily: FONT,
  fontSize: '0.68rem',
  fontWeight: 900,
  letterSpacing: '0.1em',
  mb: 0.3,
};

const modeChipSx = (chip) => ({
  height: 18,
  fontSize: '0.52rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  borderRadius: 1,
  mb: 0.3,
  color: chip.color,
  borderColor: chip.borderColor,
  bgcolor: chip.bgColor,
  '& .MuiChip-label': { px: 0.5 },
});


const totalSx = {
  fontFamily: FONT,
  fontWeight: 900,
  lineHeight: 1,
  my: 0.2,
};

const detailSx = {
  fontSize: '0.66rem',
  color: 'text.primary',
  lineHeight: 1.35,
};

// The little point that makes it a speech bubble rather than a box, and the
// anchor the whole thing grows out of.
const tailSx = {
  position: 'absolute',
  left: '50%',
  bottom: -8,
  ml: '-7px',
  width: 0,
  height: 0,
  borderLeft: '7px solid transparent',
  borderRight: '7px solid transparent',
  borderTop: '8px solid rgba(26,23,19,0.97)',
};
