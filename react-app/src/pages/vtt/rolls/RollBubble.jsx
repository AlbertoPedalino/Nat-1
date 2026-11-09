import { Box, Chip, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { resolveToastLayout } from '../../../shared/character/dice/rollToastLayout.js';
import DiceRow from '../../../shared/character/dice/DiceRow.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { rollToast } from '../../../shared/vtt/rolls/rollFeed.js';
import { UI_SHADOWS } from '../../../shared/ui/shadows.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';

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
  const layout = resolveToastLayout(rollToast(roll));

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

        {layout.isCrit && <Typography sx={{ ...natSx, color: VTT_COLORS.accent }}>NATURAL 20!</Typography>}
        {layout.isFail && <Typography sx={{ ...natSx, color: VTT_COLORS.danger }}>NATURAL 1</Typography>}

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
            fontSize: (layout.isCrit || layout.isFail) ? FONT_SIZES.display : FONT_SIZES.title,
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
  px: 1.25,
  py: 1,
  minWidth: 150,
  maxWidth: 260,
  textAlign: 'center',
  borderRadius: 2,
  bgcolor: vttAlpha(VTT_COLORS.surfaceRaised, OPACITY.solid),
  border: '2px solid',
  borderColor: 'divider',
  boxShadow: UI_SHADOWS.popup,
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
  px: 2.25,
  '&:focus-visible': { outline: `2px solid ${VTT_COLORS.accent}`, outlineOffset: 2 },
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
  bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.line),
};

const critSx = {
  borderColor: VTT_COLORS.accent,
  boxShadow: `${UI_SHADOWS.popup}, 0 0 18px ${vttAlpha(VTT_COLORS.accent, OPACITY.line)}`,
};

const failSx = {
  borderColor: VTT_COLORS.danger,
  boxShadow: `${UI_SHADOWS.popup}, 0 0 18px ${vttAlpha(VTT_COLORS.danger, OPACITY.line)}`,
};

const actorSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.xs,
  color: VTT_COLORS.accent,
  lineHeight: 1.2,
};

const labelSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xs,
  color: 'text.secondary',
  mb: 0.25,
};

const natSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.sm,
  mb: 0.25,
};

const modeChipSx = (chip) => ({
  height: 18,
  fontSize: FONT_SIZES.xxxs,
  fontWeight: 700,
  letterSpacing: LETTER_SPACINGS.md,
  borderRadius: 1,
  mb: 0.25,
  color: chip.color,
  borderColor: chip.borderColor,
  bgcolor: chip.bgColor,
  '& .MuiChip-label': { px: 0.5 },
});


const totalSx = {
  ...TEXT_STYLES.figure,
  lineHeight: 1,
  my: 0.25,
};

const detailSx = {
  fontSize: FONT_SIZES.sm,
  color: 'text.primary',
  lineHeight: 1.35,
};

// The little point that makes it a speech bubble rather than a box, and the
// anchor the whole thing grows out of.
const tailSx = {
  position: 'absolute',
  left: '50%',
  bottom: -8,
  ml: -1,
  width: 0,
  height: 0,
  borderLeft: '7px solid transparent',
  borderRight: '7px solid transparent',
  borderTop: `8px solid ${vttAlpha(VTT_COLORS.surfaceRaised, OPACITY.solid)}`,
};
