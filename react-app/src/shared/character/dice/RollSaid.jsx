import { Box, Typography } from '@mui/material';
import DiceRow from './DiceRow.jsx';
import { UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES, FONT_WEIGHTS, LETTER_SPACINGS, LINE_HEIGHTS } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { bubbleTone } from '../../ui/bubbleLooks.js';
import TagChip from '../../ui/TagChip.jsx';
import BubbleHeader from '../../ui/BubbleHeader.jsx';
import { drawnTotalColor, useDrawnToast } from '../../ui/DrawnToast.jsx';
import { toastBand, toastHeadline, toastLook } from '../../ui/toastDrawing.js';
import MeasuredDrawing from '../../ui/MeasuredDrawing.jsx';
import { PLAIN_LETTERING } from '../../ui/shadows.js';

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
// holds it. On a drawn toast that makes a front page of the roll (its look's
// `headline`): the name as its headline, the total as a poster's figure; at
// a moment the page prints news of its own, which says the moment (a deck
// typed under it, where it has one), and the name is the second headline.
const SIZES = Object.freeze({
  toast: Object.freeze({
    name: FONT_SIZES.title, moment: FONT_SIZES.title, dice: 58, solids: 3, total: FONT_SIZES.display, loud: FONT_SIZES.hero, detail: FONT_SIZES.xl, centered: false,
    headline: FONT_SIZES.hero, deck: FONT_SIZES.xl, poster: FONT_SIZES.poster,
  }),
  bubble: Object.freeze({
    name: FONT_SIZES.xxl, moment: FONT_SIZES.lg, dice: 40, solids: 0, total: FONT_SIZES.heading, loud: FONT_SIZES.display, detail: FONT_SIZES.sm, centered: true,
    headline: FONT_SIZES.title, deck: FONT_SIZES.xs, poster: FONT_SIZES.hero,
  }),
});

const ACTOR_SX = { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xs, color: UI_COLORS.accentText, lineHeight: LINE_HEIGHTS.tight };
// A roll's name, its moment and its numbers are shouted, in the style's lettering.
const SHOUT_SX = { ...TEXT_STYLES.shout, mb: 0.25 };
const HEADLINE_SX = { lineHeight: LINE_HEIGHTS.none, mt: 0.5 };
// The news, printed on the block the drawing lays under it (toastDrawing.js
// toastBand): across the page, in the paper's own colour, plainly lettered.
const NEWS_SX = { position: 'relative', isolation: 'isolate', px: 1, pt: 0.75, pb: 0.5, mb: 0.75 };
const NEWS_WORDS_SX = { ...TEXT_STYLES.shout, ...PLAIN_LETTERING, lineHeight: LINE_HEIGHTS.none, color: UI_COLORS.paper };
// How the roll was made (advantage, disadvantage), printed on a page as a
// line of its own, in its ink, between two dashes: a chip is no part of a page.
const PAGE_MODE_SX = { ...TEXT_STYLES.label, fontSize: FONT_SIZES.xs, letterSpacing: LETTER_SPACINGS.xxl, lineHeight: LINE_HEIGHTS.tight, color: UI_COLORS.textSecondary, mb: 0.75 };
const DASH = '\u2014';
// The deck typed under the news, on the page itself.
const DECK_SX = { ...TEXT_STYLES.prose, fontWeight: FONT_WEIGHTS.bold, lineHeight: LINE_HEIGHTS.tight, mb: 0.75 };
const TOTAL_ROW_SX = { textAlign: 'center', my: 0.25 };
const TOTAL_SX = { ...TEXT_STYLES.shout, lineHeight: LINE_HEIGHTS.none };
const DETAIL_SX = { color: UI_COLORS.textPrimary, lineHeight: LINE_HEIGHTS.normal, mt: 0.25 };

export default function RollSaid({ layout, moment, size = 'toast', seed, rolledWith, actor, onClose, hint = false }) {
  const { kind, drawn, written } = useDrawnToast();
  const at = SIZES[size];
  const loud = drawn || layout.isCrit || layout.isFail;
  const page = drawn && toastLook(kind).headline;
  // The page's own headline at a moment: it says the moment, and the roll's
  // name is then the second headline.
  const news = page ? toastHeadline(kind, moment.moment) : null;

  return (
    <>
      <BubbleHeader onClose={onClose} hint={hint} centered={at.centered || drawn} paper={page}>
        {actor ? <Typography sx={ACTOR_SX}>{actor}</Typography> : null}
        {news ? (
          <Box sx={NEWS_SX}>
            <MeasuredDrawing draw={(w, h) => toastBand(kind, w, h, moment.moment)} />
            <Typography sx={{ ...NEWS_WORDS_SX, fontSize: at.headline }}>{news.news}</Typography>
          </Box>
        ) : null}
        {news?.deck ? <Typography sx={{ ...DECK_SX, fontSize: at.deck, color: written(moment.labelColor) }}>{news.deck}</Typography> : null}
        <Typography sx={{ ...SHOUT_SX, fontSize: at.name, color: written(layout.tone || UI_COLORS.textPrimary), ...(page && !news ? { ...HEADLINE_SX, fontSize: at.headline } : null) }}>
          {layout.label}
        </Typography>
      </BubbleHeader>

      {moment.label && !news ? (
        <Typography sx={{ ...SHOUT_SX, fontSize: at.moment, color: written(moment.labelColor) }}>
          {moment.label}
        </Typography>
      ) : null}

      {layout.modeChip && (page
        ? <Typography sx={PAGE_MODE_SX}>{DASH} {layout.modeChip.label} {DASH}</Typography>
        : <TagChip label={layout.modeChip.label} tone={layout.modeChip.tone} sx={{ mb: 0.25 }} />
      )}

      {/* Marked for a drawing laid by where the dice and the total stand (DrawnToast placesOf). */}
      <Box data-roll-part="dice">
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
      </Box>

      {layout.total != null && (
        <Box data-roll-part="total" sx={TOTAL_ROW_SX}>
          <Typography component="span" sx={{
            ...TOTAL_SX,
            // The total is what a drawn toast is carved for: always loud.
            fontSize: (page && at.poster) || (loud ? at.loud : at.total),
            // On a bubble a natural 20 or 1 is written light on its burst, the
            // ink outline keeping it legible on the gold as on the red; a
            // drawn toast carves it in its own colour, on no burst.
            color: drawn ? drawnTotalColor(layout, kind) : (layout.isCrit || layout.isFail ? UI_COLORS.textPrimary : bubbleTone(layout.totalColor)),
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
