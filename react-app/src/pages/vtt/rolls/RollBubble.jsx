import { Box, Chip, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { resolveToastLayout } from '../../../shared/character/dice/rollToastLayout.js';
import DiceRow from '../../../shared/character/dice/DiceRow.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES, LETTER_SPACINGS, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { rollToast } from '../../../shared/vtt/rolls/rollFeed.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { DURATIONS } from '../../../shared/ui/motion.js';
import { bubbleSx, bubbleTailSx, comicShadow } from '../../../shared/ui/bubble.js';

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
          ...rollBubbleSx,
          ...(layout.isCrit ? critSx : {}),
          ...(layout.isFail ? failSx : {}),
          ...(onDismiss ? dismissableSx : {}),
        }}
      >
        {onDismiss ? (
          <Box aria-hidden sx={closeSx}>
            <X size={ICON_SIZES.xxs} strokeWidth={2.6} />
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

const rollBubbleSx = {
  position: 'relative',
  px: 1.25,
  py: 1,
  minWidth: 150,
  maxWidth: 260,
  textAlign: 'center',
  // The comic speech bubble, its tail on the token that speaks.
  ...bubbleSx({ fill: VTT_COLORS.surfaceRaised }),
  ...bubbleTailSx({ fill: VTT_COLORS.surfaceRaised, side: 'bottom', at: '50%' }),
  // Grows out of the tail, which sits on the token — so the roll looks spoken by
  // the piece rather than dropped onto the map from somewhere off screen.
  transformOrigin: 'bottom center',
  animation: `gbRollBubbleIn ${DURATIONS.slow}ms cubic-bezier(0.34, 1.4, 0.64, 1)`,
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

// A natural 20 or 1 throws the bubble's shadow in its own colour.
const critSx = { boxShadow: comicShadow(VTT_COLORS.accent) };

const failSx = { boxShadow: comicShadow(VTT_COLORS.danger) };

const actorSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.xs,
  color: VTT_COLORS.accent,
  lineHeight: LINE_HEIGHTS.tight,
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
  height: CONTROL_HEIGHTS.xs,
  fontSize: FONT_SIZES.xxxs,
  fontWeight: FONT_WEIGHTS.bold,
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
  lineHeight: LINE_HEIGHTS.none,
  my: 0.25,
};

const detailSx = {
  fontSize: FONT_SIZES.sm,
  color: 'text.primary',
  lineHeight: LINE_HEIGHTS.normal,
};

