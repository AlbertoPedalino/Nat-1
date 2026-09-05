import { Box, Typography } from '@mui/material';
import { classIcon } from '../../../shared/character/classIcon.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';

export const PIECE_POINTER_DRAG_EVENT = 'gb:vtt-piece-pointer-drag';
const POINTER_DRAG_THRESHOLD = 7;
export const PIECE_TOUCH_HOLD_MS = 360;

// One pointer path for mouse, touch and pen avoids native HTML drag-and-drop
// losing its source when a floating tool panel fades during placement. A short
// tap keeps the normal click action, while moving far enough starts a placement
// that SceneViewport can follow across every overlay.
export function beginPiecePointerDrag(event, placement, {
  onPlacementDragStart,
  onPlacementDragEnd,
} = {}) {
  if (!['mouse', 'touch', 'pen'].includes(event.pointerType)
    || event.isPrimary === false
    || (event.pointerType === 'mouse' && event.button !== 0)
    || !placement) return;
  const nestedControl = event.target.closest?.('button, input, select, textarea, a');
  if (nestedControl && nestedControl !== event.currentTarget) return;

  const pointerId = event.pointerId;
  const origin = { x: event.clientX, y: event.clientY };
  const source = event.currentTarget;
  const waitsForHold = event.pointerType === 'touch';
  let dragging = false;
  let holdTimer = null;

  const emit = (phase, pointerEvent) => {
    window.dispatchEvent(new CustomEvent(PIECE_POINTER_DRAG_EVENT, {
      detail: {
        phase,
        placement,
        clientX: pointerEvent.clientX,
        clientY: pointerEvent.clientY,
      },
    }));
  };
  const blockClick = (clickEvent) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
  };
  const blockTouchScroll = (touchEvent) => {
    if (dragging) touchEvent.preventDefault();
  };
  const capturePointer = () => {
    try {
      source.setPointerCapture?.(pointerId);
    } catch {
      // Synthetic test events and older browsers may not expose pointer capture.
    }
  };
  const cleanup = () => {
    if (holdTimer !== null) clearTimeout(holdTimer);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('touchmove', blockTouchScroll);
    try {
      if (source.hasPointerCapture?.(pointerId)) source.releasePointerCapture(pointerId);
    } catch {
      // The browser may already have released capture on pointerup/cancel.
    }
  };
  const activate = (pointerEvent) => {
    dragging = true;
    holdTimer = null;
    capturePointer();
    onPlacementDragStart?.(placement);
    emit('move', pointerEvent);
  };
  const move = (pointerEvent) => {
    if (pointerEvent.pointerId !== pointerId) return;
    const distance = Math.hypot(pointerEvent.clientX - origin.x, pointerEvent.clientY - origin.y);
    if (!dragging && waitsForHold) {
      if (distance >= POINTER_DRAG_THRESHOLD) cleanup();
      return;
    }
    if (!dragging && distance < POINTER_DRAG_THRESHOLD) return;
    if (!dragging) return activate(pointerEvent);
    pointerEvent.preventDefault();
    emit('move', pointerEvent);
  };
  const finish = (pointerEvent) => {
    if (pointerEvent.pointerId !== pointerId) return;
    cleanup();
    if (!dragging) return;
    pointerEvent.preventDefault();
    emit('drop', pointerEvent);
    // A pointer drag otherwise produces a click after pointerup, which would also
    // run the source's quick-place action and create a duplicate piece.
    source.addEventListener('click', blockClick, { capture: true, once: true });
    setTimeout(() => source.removeEventListener('click', blockClick, true), 0);
    onPlacementDragEnd?.();
  };
  const cancel = (pointerEvent) => {
    if (pointerEvent.pointerId !== pointerId) return;
    cleanup();
    if (!dragging) return;
    emit('cancel', pointerEvent);
    onPlacementDragEnd?.();
  };

  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', finish, { passive: false });
  window.addEventListener('pointercancel', cancel);
  if (waitsForHold) {
    // Register this non-passive listener before the gesture begins. It allows
    // ordinary scrolling until the hold activates, then keeps vertical motion
    // attached to the piece instead of handing it to the page.
    window.addEventListener('touchmove', blockTouchScroll, { passive: false });
    holdTimer = setTimeout(() => activate({
      clientX: origin.x,
      clientY: origin.y,
    }), PIECE_TOUCH_HOLD_MS);
  }
}

// The same compact token appears in Pieces, in placement dialogs and as the
// browser's drag image. Once it reaches the map, SceneViewport renders the full
// TokenSprite at its real grid size.
export default function PiecePreview({ token, size = 36, count = 1 }) {
  const imageUrl = token?.imageUrl || token?.image_url || null;
  const label = token?.label || 'Piece';
  const isCharacter = Boolean(token?.characterId);
  const hasUploadedArtworkRing = Boolean(
    imageUrl && token?.color && (token?.imageFile || token?.imagePath),
  );
  const ClassIcon = isCharacter ? classIcon(token?.className) : null;
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((word) => word[0]?.toUpperCase()).join('');

  return (
    <Box
      data-piece-preview
      sx={{
        ...rootSx,
        width: size,
        height: size,
        bgcolor: token?.color || VTT_COLORS.objectDefault,
        borderWidth: isCharacter || hasUploadedArtworkRing ? 5 : 2,
        borderColor: isCharacter || hasUploadedArtworkRing
          ? (token?.color || vttAlpha(VTT_COLORS.black, 0.6))
          : vttAlpha(VTT_COLORS.gold, 0.65),
      }}
    >
      {imageUrl ? <Box component="img" src={imageUrl} alt="" draggable={false} sx={imageSx} /> : null}
      {!imageUrl && ClassIcon ? (
        <Box data-class-icon={token?.className || 'unknown'} sx={classIconSx}>
          <ClassIcon size={Math.round(size * 0.52)} />
        </Box>
      ) : null}
      {!imageUrl && !ClassIcon ? (
        <Typography component="span" sx={initialsSx}>{initials || '?'}</Typography>
      ) : null}
      {count > 1 ? <Box sx={countSx}>×{count}</Box> : null}
    </Box>
  );
}

const rootSx = {
  position: 'relative',
  flexShrink: 0,
  borderRadius: '50%',
  overflow: 'visible',
  borderStyle: 'solid',
  boxShadow: `0 3px 10px ${vttAlpha(VTT_COLORS.black, 0.72)}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

const imageSx = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '50%',
  pointerEvents: 'none',
};

const initialsSx = {
  color: VTT_COLORS.goldPreview,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  fontWeight: 800,
};

const classIconSx = {
  display: 'flex',
  color: VTT_COLORS.parchment,
  filter: `drop-shadow(0 1px 2px ${vttAlpha(VTT_COLORS.black, 0.9)})`,
  pointerEvents: 'none',
};

const countSx = {
  position: 'absolute',
  right: -6,
  bottom: -5,
  minWidth: 20,
  height: 20,
  px: 0.4,
  borderRadius: 10,
  bgcolor: VTT_COLORS.gold,
  color: VTT_COLORS.ink,
  border: `1px solid ${VTT_COLORS.ink}`,
  fontSize: '0.62rem',
  fontWeight: 900,
  lineHeight: '18px',
  textAlign: 'center',
};
