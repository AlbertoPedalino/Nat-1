import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

// Styles of a piece on the battle map: the cell layout (art, name plate, HP or
// death-save bars, reminders), handles, badges, condition pills and tooltips.

export const initialsSx = {
  fontSize: 'clamp(8px, 24cqmin, 18px)',
  fontWeight: 800,
  color: vttAlpha(VTT_COLORS.black, 0.75),
  pointerEvents: 'none',
};

export const classIconSx = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: VTT_COLORS.parchment,
  filter: `drop-shadow(0 1px 2px ${vttAlpha(VTT_COLORS.black, 0.9)})`,
  pointerEvents: 'none',
};

export const mapObjectSx = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: `drop-shadow(0 2px 3px ${vttAlpha(VTT_COLORS.black, 0.95)})`,
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
  borderRadius: '3px',
  border: `2px solid ${vttAlpha(VTT_COLORS.ink, 0.95)}`,
  bgcolor: VTT_COLORS.gold,
  boxShadow: `0 1px 4px ${vttAlpha(VTT_COLORS.black, 0.85)}`,
  cursor: 'nwse-resize',
  touchAction: 'none',
  '&:hover': { bgcolor: VTT_COLORS.goldBright },
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
  border: `2px solid ${vttAlpha(VTT_COLORS.ink, 0.95)}`,
  bgcolor: VTT_COLORS.gold,
  color: VTT_COLORS.ink,
  boxShadow: `0 1px 4px ${vttAlpha(VTT_COLORS.black, 0.85)}`,
  cursor: 'grab',
  touchAction: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': { bgcolor: VTT_COLORS.goldBright },
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
  gap: '1px',
  pointerEvents: 'none',
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
  gap: '2px',
  pointerEvents: 'none',
};

const barBaseSx = {
  position: 'relative',
  borderRadius: 3,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.75),
  border: `1px solid ${vttAlpha(VTT_COLORS.black, 0.6)}`,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

export const hpBarSx = { ...barBaseSx, height: 'clamp(6px, 14cqmin, 16px)' };

export const deathTrackSx = {
  height: 'clamp(7px, 15cqmin, 18px)',
  px: 'clamp(1px, 3cqmin, 4px)',
  borderRadius: 3,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.82),
  border: `1px solid ${vttAlpha(VTT_COLORS.black, 0.65)}`,
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(1px, 3cqmin, 4px)',
  boxSizing: 'border-box',
};

export const deathDotsSx = { display: 'flex', alignItems: 'center', gap: 'clamp(1px, 2.5cqmin, 3px)' };

export const deathDotSx = {
  minWidth: 0,
  width: 'clamp(4px, 9cqmin, 10px)',
  height: 'clamp(4px, 9cqmin, 10px)',
  p: 0,
  borderRadius: '50%',
  bgcolor: vttAlpha(VTT_COLORS.neutralMark, 0.12),
  border: `1px solid ${vttAlpha(VTT_COLORS.neutralMark, 0.44)}`,
  boxSizing: 'border-box',
  cursor: 'pointer',
  '&:disabled': { cursor: 'default' },
};

export const deathSuccessSx = {
  bgcolor: VTT_COLORS.deathSuccess,
  borderColor: VTT_COLORS.successBright,
  boxShadow: `0 0 4px ${vttAlpha(VTT_COLORS.deathSuccess, 0.8)}`,
};

export const deathFailureSx = {
  bgcolor: VTT_COLORS.danger,
  borderColor: VTT_COLORS.dangerBright,
  boxShadow: `0 0 4px ${vttAlpha(VTT_COLORS.danger, 0.8)}`,
};

export const deathDividerSx = { width: 1, height: '60%', bgcolor: vttAlpha(VTT_COLORS.gold, 0.34) };

export const hpFillSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  transition: 'width 120ms linear',
};

const textBaseSx = {
  position: 'relative',
  fontSize: 'clamp(6px, 11cqmin, 12px)',
  fontWeight: 700,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
  // A dark outline keeps the figures readable over both the empty track and a
  // bright fill, without dimming the bar itself.
  textShadow: `0 1px 2px ${vttAlpha(VTT_COLORS.black, 0.9)}`,
};

export const hpTextSx = { ...textBaseSx, color: VTT_COLORS.parchment };

export const tempBarSx = { ...barBaseSx, height: 'clamp(5px, 10cqmin, 12px)' };

export const tempFillSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  bgcolor: VTT_COLORS.tempHp,
  transition: 'width 120ms linear',
};

export const tempTextSx = { ...textBaseSx, color: VTT_COLORS.tempHpText, fontSize: 'clamp(5px, 9cqmin, 10px)' };

export const plateSx = {
  flex: 'none',
  px: 'clamp(2px, 4cqmin, 5px)',
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.85),
  color: VTT_COLORS.parchmentMuted,
  // As large as the cell allows, up to what reads across the table on a
  // projector; zoomed far out it gets small rather than spilling over.
  fontSize: 'clamp(5px, 12cqmin, 11px)',
  lineHeight: 1.25,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxSizing: 'border-box',
};

export const secretPlateSx = {
  outline: `1px dashed ${vttAlpha(VTT_COLORS.gold, 0.9)}`,
  outlineOffset: '-1px',
};

// On the corner of the art, only just past its edge, so it reads as attached
// to the piece without reaching into the next cell.
export const badgeSx = {
  position: 'absolute',
  top: '-2px',
  right: '-2px',
  minWidth: 'clamp(10px, 22cqmin, 16px)',
  height: 'clamp(10px, 22cqmin, 16px)',
  px: '2px',
  borderRadius: '8px',
  bgcolor: VTT_COLORS.warning,
  color: VTT_COLORS.ink,
  fontSize: 'clamp(6px, 14cqmin, 10px)',
  fontWeight: 800,
  lineHeight: 'clamp(10px, 22cqmin, 16px)',
  boxSizing: 'border-box',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transition: 'all 120ms ease',
};

// A thin white ring keeps the colour apart from the art and from the map.
const turnRing = `0 0 0 2px ${VTT_COLORS.white}, 0 0 0 5px ${VTT_COLORS.turnActive}`;

export const turnActiveSx = {
  boxShadow: `${turnRing}, 0 0 18px 6px ${vttAlpha(VTT_COLORS.turnActive, 0.7)}`,
  animation: 'gbTurnGlow 1.6s ease-in-out infinite',
  '@keyframes gbTurnGlow': {
    '0%, 100%': { boxShadow: `${turnRing}, 0 0 12px 3px ${vttAlpha(VTT_COLORS.turnActive, 0.55)}` },
    '50%': { boxShadow: `${turnRing}, 0 0 26px 10px ${vttAlpha(VTT_COLORS.turnActive, 0.85)}` },
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
  border: `2px solid ${vttAlpha(VTT_COLORS.ink, 0.92)}`,
  boxShadow: `0 2px 5px ${vttAlpha(VTT_COLORS.black, 0.75)}`,
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
  gap: '3px',
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
  gap: '3px',
};

// Nearest the piece, under the marks.
export const remindersSx = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '2px',
};

// The light blue of the reminder chips on the sheet and in the token menu, so
// the same thing is the same colour everywhere. On a dark plate rather than a
// tint, because it has to stay legible over any map.
export const reminderSx = {
  maxWidth: 170,
  px: 0.6,
  py: '1px',
  borderRadius: '10px',
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.88),
  color: 'info.main',
  border: '1px solid',
  borderColor: 'info.main',
  fontSize: '0.74rem',
  fontWeight: 700,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const reminderInlineSx = {
  ...reminderSx,
  minWidth: 0,
  maxWidth: '100%',
  px: 'clamp(2px, 3cqmin, 5px)',
  py: 0,
  fontSize: 'clamp(6px, 11cqmin, 12px)',
  lineHeight: 1.3,
};

export const pillSx = {
  px: 0.6,
  py: '1px',
  borderRadius: '10px',
  fontSize: '0.78rem',
  fontWeight: 700,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  border: `1px solid ${vttAlpha(VTT_COLORS.black, 0.55)}`,
};

export const conditionPillSx = { bgcolor: VTT_COLORS.warning, color: VTT_COLORS.ink };

export const conditionTooltipSx = {
  maxWidth: 360,
  p: 0,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.98),
  border: `1px solid ${vttAlpha(VTT_COLORS.warning, 0.55)}`,
  boxShadow: 8,
  '& .MuiTooltip-arrow': { color: vttAlpha(VTT_COLORS.ink, 0.98) },
};

export const conditionTooltipBodySx = { p: 1 };

export const conditionTooltipTitleSx = {
  mb: 0.55,
  fontFamily: UI_FONTS.display,
  fontSize: '0.72rem',
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: VTT_COLORS.warning,
};
