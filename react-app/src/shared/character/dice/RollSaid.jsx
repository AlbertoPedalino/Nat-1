import { Box, Typography } from '@mui/material';
import DiceRow from './DiceRow.jsx';
import { UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { bubbleTone } from '../../ui/bubbleLooks.js';
import TagChip from '../../ui/TagChip.jsx';
import BubbleHeader from '../../ui/BubbleHeader.jsx';
import { drawnTotalColor, useDrawnToast } from '../../ui/DrawnToast.jsx';

// What a roll says, wherever it is shown: who rolled, the roll's name, its
// moment (a natural 20 or 1), how it was rolled, the dice, the total; or, for
// what has neither dice nor total (a rest, a death-save guard), the line the
// roller saw. One wording at two sizes: the sheet's `toast` (DiceToast) and
// the `bubble` over a piece on the map (RollBubble), so the roller and the
// table read the same thing, on the style's bubble as on what it draws in its
// place (DrawnToast.jsx).
//
// `layout` is the roll laid out (rollToastLayout.js), `moment` the roll as
// its bubble shows it (useRollMoment), `seed` the throw, `rolledWith` the
// dice set it was thrown with. `onClose` closes it from its X; `hint` draws
// the X only, on what closes at a tap anywhere.

// At each size: its lettering, its dice (px, and up to how many are shown as
// whole solids: thousands of composited planes, a handful at most), its total
// (louder at a natural 20 or 1), and whether its head is centred whatever
// holds it.
const SIZES = Object.freeze({
  toast: Object.freeze({ name: FONT_SIZES.title, moment: FONT_SIZES.title, dice: 58, solids: 3, total: FONT_SIZES.display, loud: FONT_SIZES.hero, detail: FONT_SIZES.xl, centered: false }),
  bubble: Object.freeze({ name: FONT_SIZES.xxl, moment: FONT_SIZES.lg, dice: 40, solids: 0, total: FONT_SIZES.heading, loud: FONT_SIZES.display, detail: FONT_SIZES.sm, centered: true }),
});

const ACTOR_SX = { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xs, color: UI_COLORS.accentText, lineHeight: LINE_HEIGHTS.tight };
// A roll's name, its moment and its numbers are shouted, in the style's lettering.
const SHOUT_SX = { ...TEXT_STYLES.shout, mb: 0.25 };
const TOTAL_ROW_SX = { textAlign: 'center', my: 0.25 };
const TOTAL_SX = { ...TEXT_STYLES.shout, lineHeight: LINE_HEIGHTS.none };
const DETAIL_SX = { color: UI_COLORS.textPrimary, lineHeight: LINE_HEIGHTS.normal, mt: 0.25 };

export default function RollSaid({ layout, moment, size = 'toast', seed, rolledWith, actor, onClose, hint = false }) {
  const { drawn, written } = useDrawnToast();
  const at = SIZES[size];
  const loud = drawn || layout.isCrit || layout.isFail;

  return (
    <>
      <BubbleHeader onClose={onClose} hint={hint} centered={at.centered || drawn}>
        {actor ? <Typography sx={ACTOR_SX}>{actor}</Typography> : null}
        <Typography sx={{ ...SHOUT_SX, fontSize: at.name, color: written(layout.tone || UI_COLORS.textPrimary) }}>
          {layout.label}
        </Typography>
      </BubbleHeader>

      {moment.label ? (
        <Typography sx={{ ...SHOUT_SX, fontSize: at.moment, color: written(moment.labelColor) }}>
          {moment.label}
        </Typography>
      ) : null}

      {layout.modeChip && (
        <TagChip label={layout.modeChip.label} tone={layout.modeChip.tone} sx={{ mb: 0.25 }} />
      )}

      <DiceRow
        // Keyed by the throw, not just seeded by it: rolling again while it is
        // still up replaces its contents rather than remounting them, and a
        // CSS animation that never remounts never plays again.
        key={`dice:${seed}`}
        dice={layout.dice}
        modifier={layout.modifier}
        modifierColor={layout.modifierColor && bubbleTone(layout.modifierColor)}
        size={at.dice}
        justify={at.centered ? 'center' : undefined}
        seed={seed}
        rolledWith={rolledWith}
        solid={layout.dice.length <= at.solids}
      />

      {layout.total != null && (
        <Box sx={TOTAL_ROW_SX}>
          <Typography component="span" sx={{
            ...TOTAL_SX,
            // The total is what a drawn toast is carved for: always loud.
            fontSize: loud ? at.loud : at.total,
            // On a bubble a natural 20 or 1 is written light on its burst, the
            // ink outline keeping it legible on the gold as on the red; a
            // drawn toast carves it in its own colour, on no burst.
            color: drawn ? drawnTotalColor(layout) : (layout.isCrit || layout.isFail ? UI_COLORS.textPrimary : bubbleTone(layout.totalColor)),
            ...((drawn ? null : moment.totalSx) ?? { display: 'inline-block' }),
          }}>
            {layout.total}
          </Typography>
        </Box>
      )}

      {layout.total == null && layout.dice.length === 0 && layout.detail && (
        <Typography sx={{ ...DETAIL_SX, fontSize: at.detail }}>{layout.detail}</Typography>
      )}
    </>
  );
}
