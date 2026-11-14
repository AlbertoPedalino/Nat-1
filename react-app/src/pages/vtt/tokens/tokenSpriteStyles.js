import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { OPACITY, UI_COLORS } from '../../../shared/ui/colors.js';
import { DURATIONS } from '../../../shared/ui/motion.js';
import { inkPieceShadow } from '../../../shared/ui/shadows.js';
import { chipSolidStyle } from '../../../shared/ui/entityColors.js';
import { SEAL_RADIUS } from '../../../shared/ui/shapes.js';
import { TEXT_STYLES, ONE_LINE_SX } from '../../../shared/ui/textStyles.js';

// Styles of a piece on the battle map: the cell layout (art, name plate, HP or
// death-save bars, reminders), handles, badges, condition pills and tooltips.

// How much a piece shows, by how large its cell is drawn on screen (px
// across), in three steps:
//   - close (`inside` and over): everything inside its cell;
//   - further (`outside` to `inside`): everything still shown, but out of the
//     cell — the reminders over it, the name, the hit point bars and their
//     figures under it — so the art keeps its whole square and stays on the
//     grid, and every word stays readable;
//   - far (under `outside`): the piece and its name alone, to find it.
// What a step leaves out is a hover or a tap away (the marks open above the
// piece). Read by a container query on the piece's own cell (the sprite is
// the container), so nothing is measured or drawn again while zooming.
const TOKEN_DETAIL = Object.freeze({ inside: 48, outside: 24 });

function below(px, sx) {
  return { [`@container (max-width: ${px - 0.02}px)`]: sx };
}

function hiddenBelow(px) {
  return below(px, { display: 'none' });
}

export const initialsSx = {
  fontSize: 'clamp(8px, 24cqmin, 18px)',
  fontWeight: FONT_WEIGHTS.heavy,
  color: vttAlpha(VTT_COLORS.black, OPACITY.heavy),
  pointerEvents: 'none',
};

export const classIconSx = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: VTT_COLORS.text,
  filter: `drop-shadow(0 1px 2px ${vttAlpha(VTT_COLORS.black, OPACITY.solid)})`,
  pointerEvents: 'none',
};

export const mapObjectSx = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: `drop-shadow(0 2px 3px ${vttAlpha(VTT_COLORS.black, OPACITY.solid)})`,
  pointerEvents: 'none',
};

export const resizeHandleSx = {
  position: 'absolute',
  right: -5,
  bottom: -5,
  zIndex: 5,
  width: 14,
  height: 14,
  p: 0,
  borderRadius: 0.375,
  border: `2px solid ${vttAlpha(VTT_COLORS.surface, OPACITY.solid)}`,
  bgcolor: VTT_COLORS.accent,
  boxShadow: `0 1px 4px ${vttAlpha(VTT_COLORS.black, OPACITY.veil)}`,
  cursor: 'nwse-resize',
  touchAction: 'none',
  '&:hover': { bgcolor: VTT_COLORS.accentHighlight },
};

export const rotateHandleSx = {
  position: 'absolute',
  right: -5,
  top: -5,
  zIndex: 5,
  width: 16,
  height: 16,
  p: 0,
  borderRadius: '50%',
  border: `2px solid ${vttAlpha(VTT_COLORS.surface, OPACITY.solid)}`,
  bgcolor: VTT_COLORS.accent,
  color: VTT_COLORS.surface,
  boxShadow: `0 1px 4px ${vttAlpha(VTT_COLORS.black, OPACITY.veil)}`,
  cursor: 'grab',
  touchAction: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': { bgcolor: VTT_COLORS.accentHighlight },
};

// The cell as one column: reminder line, art, name and bars. The art takes
// whatever height is left and stays round through its aspect ratio, so a piece
// with nothing written on it still fills its cell.
export const cellLayoutSx = {
  position: 'absolute',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2cqmin',
};

export const discFrameSx = {
  position: 'relative',
  flex: '1 1 0',
  minHeight: 0,
  aspectRatio: '1',
  maxWidth: '100%',
};

export const pieceLayoutSx = { position: 'absolute', inset: 0 };

export const pieceFrameSx = { position: 'relative', width: '100%', height: '100%' };

export const stackInsideSx = {
  flex: 'none',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1.5cqmin',
  pointerEvents: 'none',
  // A small cell gives its art the whole square: name and bar hang under it.
  ...below(TOKEN_DETAIL.inside, {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    mt: 0.125,
    gap: 0.125,
  }),
};

// An object's label hangs under it, centred however wide the name is.
export const stackBelowSx = {
  ...stackInsideSx,
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: '50%',
  width: 'max-content',
  transform: 'translateX(-50%)',
};

// One line: the first reminder and how many more there are. The rest are a
// hover or a tap away, written out in full above the piece.
export const inlineRemindersSx = {
  flex: 'none',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  gap: '1.5cqmin',
  pointerEvents: 'none',
  // A small cell gives its art the whole square: the reminders stand over it,
  // as wide as their words need, centred on the piece.
  ...below(TOKEN_DETAIL.inside, {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    width: 'max-content',
    transform: 'translateX(-50%)',
    gap: 0.25,
    mb: 0.125,
  }),
  ...hiddenBelow(TOKEN_DETAIL.outside),
};

// A piece's hit point bars (HitPointBars): sized to the cell, their ink edge
// thinned to suit a strip a few pixels tall.
const barSizeSx = { borderWidth: 'clamp(1px, 2cqmin, 2px)', borderRadius: 3 };

export const hpBarSx = {
  ...barSizeSx,
  height: 'clamp(6px, 14cqmin, 16px)',
  // Under a small cell: a bar wide and tall enough for its figures.
  ...below(TOKEN_DETAIL.inside, { width: 44, height: 10 }),
  ...hiddenBelow(TOKEN_DETAIL.outside),
};

export const deathTrackSx = {
  height: 'clamp(7px, 15cqmin, 18px)',
  px: 'clamp(1px, 3cqmin, 4px)',
  borderRadius: 3,
  bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.veil),
  border: `1px solid ${vttAlpha(VTT_COLORS.black, OPACITY.heavy)}`,
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(1px, 3cqmin, 4px)',
  boxSizing: 'border-box',
  ...hiddenBelow(TOKEN_DETAIL.outside),
};

export const deathDotsSx = { display: 'flex', alignItems: 'center', gap: 'clamp(1px, 2.5cqmin, 3px)' };

export const deathDotSx = {
  minWidth: 0,
  width: 'clamp(4px, 9cqmin, 10px)',
  height: 'clamp(4px, 9cqmin, 10px)',
  p: 0,
  borderRadius: '50%',
  bgcolor: vttAlpha(VTT_COLORS.neutralMark, OPACITY.tint),
  border: `1px solid ${vttAlpha(VTT_COLORS.neutralMark, OPACITY.edge)}`,
  boxSizing: 'border-box',
  cursor: 'pointer',
  '&:disabled': { cursor: 'default' },
};

export const deathSuccessSx = {
  bgcolor: VTT_COLORS.success,
  borderColor: VTT_COLORS.success,
  boxShadow: `0 0 4px ${vttAlpha(VTT_COLORS.success, OPACITY.veil)}`,
};

export const deathFailureSx = {
  bgcolor: VTT_COLORS.hpCritical,
  borderColor: VTT_COLORS.danger,
  boxShadow: `0 0 4px ${vttAlpha(VTT_COLORS.hpCritical, OPACITY.veil)}`,
};

export const deathDividerSx = { width: 1, height: '60%', bgcolor: vttAlpha(VTT_COLORS.accent, OPACITY.line) };

const textBaseSx = {
  position: 'relative',
  fontSize: 'clamp(6px, 11cqmin, 12px)',
  fontWeight: FONT_WEIGHTS.bold,
  lineHeight: LINE_HEIGHTS.none,
  fontVariantNumeric: 'tabular-nums',
  // A dark outline keeps the figures readable over both the empty track and a
  // bright fill, without dimming the bar itself.
  textShadow: `0 1px 2px ${vttAlpha(VTT_COLORS.black, OPACITY.solid)}`,
};

export const hpTextSx = { ...textBaseSx, color: VTT_COLORS.text, ...below(TOKEN_DETAIL.inside, { fontSize: FONT_SIZES.xxxs }) };

export const tempBarSx = {
  ...barSizeSx,
  height: 'clamp(5px, 10cqmin, 12px)',
  ...below(TOKEN_DETAIL.inside, { width: 36, height: 8 }),
  ...hiddenBelow(TOKEN_DETAIL.outside),
};

export const tempTextSx = { ...textBaseSx, color: VTT_COLORS.tempHpText, fontSize: 'clamp(5px, 9cqmin, 10px)', ...below(TOKEN_DETAIL.inside, { fontSize: FONT_SIZES.micro }) };

export const plateSx = {
  ...ONE_LINE_SX,
  flex: 'none',
  px: 'clamp(2px, 4cqmin, 5px)',
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.surface, OPACITY.veil),
  color: VTT_COLORS.text,
  // As large as the cell allows, up to what reads across the table on a
  // projector; zoomed far out it gets small rather than spilling over.
  fontSize: 'clamp(5px, 12cqmin, 11px)',
  lineHeight: LINE_HEIGHTS.snug,
  boxSizing: 'border-box',
  // Under a small cell the name is written whole, wider than the cell, at the
  // smallest size that still reads, so the piece can be found.
  ...below(TOKEN_DETAIL.inside, { maxWidth: 'none', width: 'max-content', fontSize: FONT_SIZES.xxs }),
};

export const secretPlateSx = {
  outline: `1px dashed ${vttAlpha(VTT_COLORS.accent, OPACITY.solid)}`,
  outlineOffset: '-1px',
};

// Every mark on a piece is the app's one solid chip (chipSolidStyle, as
// every TagChip): a condition orange, a reminder blue (as on the sheet and in
// the piece's menu). A mark's name is a rounded plate; a count of them is the
// same chip on the seal's edge (SEAL_RADIUS), as every count of the app
// (CountSeal). On the map the edge is a thin line, the chip a few pixels tall.
const MARK_TONES = Object.freeze({ condition: VTT_COLORS.warning, reminder: UI_COLORS.info });

function markChipSx(kind) {
  return {
    ...chipSolidStyle(MARK_TONES[kind]),
    borderWidth: 1,
    borderStyle: 'solid',
    fontWeight: FONT_WEIGHTS.heavy,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  };
}

function markCountSx(kind) {
  return { ...markChipSx(kind), borderRadius: SEAL_RADIUS, textAlign: 'center' };
}

// The count of conditions on the corner of the art, only just past its edge,
// so it reads as attached to the piece without reaching into the next cell.
export const badgeSx = {
  ...markCountSx('condition'),
  position: 'absolute',
  top: '-2px',
  right: '-2px',
  minWidth: 'clamp(10px, 22cqmin, 16px)',
  height: 'clamp(10px, 22cqmin, 16px)',
  px: 0.25,
  fontSize: 'clamp(6px, 14cqmin, 10px)',
  lineHeight: 'clamp(8px, 18cqmin, 14px)',
  pointerEvents: 'none',
  transition: `all ${DURATIONS.fast}ms ease`,
  ...hiddenBelow(TOKEN_DETAIL.outside),
};

// A character's piece is a cut-out laid on the map: inked round its own ring,
// its solid shadow under it, both in fractions of the piece so a zoomed-out
// board keeps them in proportion. Thick enough to stand off any map, as a
// figure on a table does. A creature's piece is left as its art was drawn: a
// bestiary token has its own frame, and an ink edge round it spoils it.
const PIECE_INK = { outline: 'clamp(1px, 3cqmin, 3px)', drop: 'clamp(2px, 5cqmin, 5px)' };
export const characterPieceSx = { boxShadow: inkPieceShadow(PIECE_INK) };

// A thin white ring keeps the colour apart from the art and from the map; the
// ink sits outside it, and the halo outside everything.
const TURN_RING_WIDTH = '5px';
const turnRing = `0 0 0 2px ${VTT_COLORS.white}, 0 0 0 ${TURN_RING_WIDTH} ${VTT_COLORS.turnActive}, ${inkPieceShadow({ ...PIECE_INK, around: TURN_RING_WIDTH })}`;

export const turnActiveSx = {
  boxShadow: `${turnRing}, 0 0 18px 6px ${vttAlpha(VTT_COLORS.turnActive, OPACITY.heavy)}`,
  animation: 'gbTurnGlow 1.6s ease-in-out infinite',
  '@keyframes gbTurnGlow': {
    '0%, 100%': { boxShadow: `${turnRing}, 0 0 12px 3px ${vttAlpha(VTT_COLORS.turnActive, OPACITY.strong)}` },
    '50%': { boxShadow: `${turnRing}, 0 0 26px 10px ${vttAlpha(VTT_COLORS.turnActive, OPACITY.veil)}` },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

export const deadBadgeSx = {
  position: 'absolute',
  top: '-3px',
  left: '-3px',
  width: 'clamp(11px, 26cqmin, 20px)',
  height: 'clamp(11px, 26cqmin, 20px)',
  borderRadius: '50%',
  bgcolor: VTT_COLORS.dangerDeep,
  color: VTT_COLORS.deathText,
  border: `2px solid ${vttAlpha(VTT_COLORS.surface, OPACITY.solid)}`,
  boxShadow: `0 2px 5px ${vttAlpha(VTT_COLORS.black, OPACITY.heavy)}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  pointerEvents: 'none',
  zIndex: 2,
};

// Above the piece and growing upwards, so a long list never covers the creature
// it describes. Nothing is trimmed: a truncated list of what is wrong with a
// creature is worse than none, because you cannot tell what was cut.
export const aboveSx = {
  position: 'absolute',
  left: '50%',
  bottom: 'calc(100% + 6px)',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0.5,
  width: 'max-content',
  maxWidth: 230,
  // Invisible hover bridge across the visual gap between disc and pills.
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100%',
    height: 8,
  },
};

export const pillsSx = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 0.5,
};

// Nearest the piece, under the marks.
export const remindersSx = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 0.25,
};

// A reminder's chip (markChipSx): filled, so it stays legible over any map.
export const reminderSx = {
  ...markChipSx('reminder'),
  ...ONE_LINE_SX,
  maxWidth: 170,
  px: 0.5,
  py: 0.25,
  borderRadius: 1.25,
  fontSize: FONT_SIZES.md,
  lineHeight: LINE_HEIGHTS.normal,
};

export const reminderInlineSx = {
  ...reminderSx,
  minWidth: 0,
  maxWidth: '100%',
  px: 'clamp(2px, 3cqmin, 5px)',
  py: 0,
  fontSize: 'clamp(6px, 11cqmin, 12px)',
  lineHeight: LINE_HEIGHTS.snug,
  // Over a small cell: the smallest size that still reads, written whole.
  ...below(TOKEN_DETAIL.inside, { fontSize: FONT_SIZES.xxs, maxWidth: 'none' }),
};

// The count of the reminders the cell has no room for ("+2"): the reminder's
// chip on the seal's edge, as the conditions' count is.
export const reminderCountSx = {
  ...markCountSx('reminder'),
  flexShrink: 0,
  px: 'clamp(2px, 3cqmin, 5px)',
  fontSize: 'clamp(6px, 11cqmin, 12px)',
  lineHeight: LINE_HEIGHTS.snug,
  // Over a small cell: the smallest size that still reads, written whole.
  ...below(TOKEN_DETAIL.inside, { fontSize: FONT_SIZES.xxs, maxWidth: 'none' }),
};

// A condition's chip (markChipSx), opened above the piece.
export const pillSx = {
  ...markChipSx('condition'),
  px: 0.5,
  py: 0.25,
  borderRadius: 1.25,
  fontSize: FONT_SIZES.lg,
  lineHeight: LINE_HEIGHTS.normal,
};

export const conditionTooltipSx = {
  maxWidth: 360,
  p: 0,
  bgcolor: vttAlpha(VTT_COLORS.surface, OPACITY.solid),
  border: `1px solid ${vttAlpha(VTT_COLORS.warning, OPACITY.strong)}`,
  boxShadow: 8,
  '& .MuiTooltip-arrow': { color: vttAlpha(VTT_COLORS.surface, OPACITY.solid) },
};

export const conditionTooltipBodySx = { p: 1 };

export const conditionTooltipTitleSx = {
  mb: 0.5,
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.md,
  color: VTT_COLORS.warning,
};
