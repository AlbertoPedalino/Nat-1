import { Box, Chip, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { resolveToastLayout } from '../../../shared/character/dice/rollToastLayout.js';
import DiceRow from '../../../shared/character/dice/DiceRow.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';

const FONT = '"Cinzel", Georgia, serif';

// What somebody just rolled, over their piece. A speech bubble because that is
// what it is: a thing said at the table, not a record — it fades on its own and
// is never written anywhere.
//
// Laid out by the same function as the sheet's toast, so the player who rolled
// and the table watching the map read the same thing.
//
// With `onDismiss`, a tap anywhere on it closes it early: the bubble sits right
// over the pieces, and on a phone eight seconds is long to wait for the board
// back. The little cross only says that it can be closed.
export default function RollBubble({ roll, x, y, underFog = false, onDismiss }) {
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
    <Box sx={{
      ...rootSx,
      ...(underFog ? underFogSx : null),
      transform: `translate(${x}px, ${y}px) translate(-50%, -100%)`,
    }}>
      <Box
        {...(onDismiss ? {
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Close roll',
          'data-viewport-control': true,
          // Not a pan, a drag or a long press on whatever is underneath.
          onPointerDown: (event) => event.stopPropagation(),
          onClick: (event) => {
            event.stopPropagation();
            onDismiss(roll.id);
          },
          onKeyDown: (event) => {
            if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Escape') return;
            event.preventDefault();
            onDismiss(roll.id);
          },
        } : null)}
        sx={{
          ...bubbleSx,
          ...(layout.isCrit ? critSx : {}),
          ...(layout.isFail ? failSx : {}),
          ...(onDismiss ? dismissableSx : {}),
        }}
      >
        {onDismiss ? (
          <Box aria-hidden sx={closeSx}>
            <X size={11} strokeWidth={2.6} />
          </Box>
        ) : null}

        {roll.actorName ? <Typography sx={actorSx}>{roll.actorName}</Typography> : null}

        <Typography sx={labelSx}>{layout.label}</Typography>

        {layout.isCrit && <Typography sx={{ ...natSx, color: VTT_COLORS.goldRoll }}>NATURAL 20!</Typography>}
        {layout.isFail && <Typography sx={{ ...natSx, color: VTT_COLORS.error }}>NATURAL 1</Typography>}

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

const underFogSx = { zIndex: 3 };

const bubbleSx = {
  position: 'relative',
  px: 1.2,
  py: 0.9,
  minWidth: 150,
  maxWidth: 260,
  textAlign: 'center',
  borderRadius: 2,
  bgcolor: vttAlpha(VTT_COLORS.surfaceRaised, 0.97),
  border: '2px solid',
  borderColor: 'divider',
  boxShadow: `0 8px 26px ${vttAlpha(VTT_COLORS.black, 0.6)}`,
  // Grows out of the tail, which sits on the token — so the roll looks spoken by
  // the piece rather than dropped onto the map from somewhere off screen.
  transformOrigin: 'bottom center',
  animation: 'gbRollBubbleIn 220ms cubic-bezier(0.34, 1.4, 0.64, 1)',
  '@keyframes gbRollBubbleIn': {
    from: { opacity: 0, transform: 'scale(0.25)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
};

const dismissableSx = {
  pointerEvents: 'auto',
  cursor: 'pointer',
  // Room for the cross, so it never sits on the actor's name.
  px: 2.2,
  '&:focus-visible': { outline: `2px solid ${VTT_COLORS.gold}`, outlineOffset: 2 },
};

const closeSx = {
  position: 'absolute',
  top: 4,
  right: 4,
  width: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  color: 'text.secondary',
  bgcolor: vttAlpha(VTT_COLORS.black, 0.35),
};

const critSx = {
  borderColor: VTT_COLORS.goldRoll,
  boxShadow: `0 8px 26px ${vttAlpha(VTT_COLORS.black, 0.6)}, 0 0 18px ${vttAlpha(VTT_COLORS.goldRoll, 0.28)}`,
};

const failSx = {
  borderColor: VTT_COLORS.error,
  boxShadow: `0 8px 26px ${vttAlpha(VTT_COLORS.black, 0.6)}, 0 0 18px ${vttAlpha(VTT_COLORS.error, 0.28)}`,
};

const actorSx = {
  fontFamily: FONT,
  fontSize: '0.6rem',
  fontWeight: 700,
  color: VTT_COLORS.gold,
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
  borderTop: `8px solid ${vttAlpha(VTT_COLORS.surfaceRaised, 0.97)}`,
};
