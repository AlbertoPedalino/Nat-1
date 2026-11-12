import { useEffect, useLayoutEffect, useRef } from 'react';
import { LAYERS } from '../../../shared/ui/layers.js';
import { cornerRadius } from '../../../shared/ui/radius.js';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { GripHorizontal, MoveDiagonal2, X } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  MAX_SHEET_HEIGHT_RATIO,
  MAX_SHEET_WIDTH_RATIO,
  MIN_SHEET_HEIGHT,
  MIN_SHEET_WIDTH,
  SHEET_VISIBLE_GRIP,
  SHEET_VISIBLE_HEADER,
  clampSheetFrame,
  readSheetFrame,
  writeSheetFrame,
} from '../../../shared/vtt/sheets/sheetFrame.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { clamp } from '../../../shared/numbers.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { UI_SHADOWS } from '../../../shared/ui/shadows.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';
import SelectField from '../../../shared/ui/SelectField.jsx';

// One key for the window itself, not one per character: the player is arranging
// a place on their screen to read a sheet, and it should not move because they
// switched which sheet is in it.
const SHEET_FRAME_KEY = 'gb-vtt-sheet-frame';

export default function FloatingSheetPanel({
  choices,
  selectedId,
  onSelectionChange,
  onClose,
  containerRef,
  children,
}) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const frameRef = useRef(0);
  // The geometry the gestures have decided on, kept here rather than read back
  // off the element afterwards. Measuring the panel at pointer-up would depend
  // on whether its queued style write had run yet, and would fold in the
  // container's border on every cycle.
  const placementRef = useRef(null);
  const picked = choices.some((entry) => entry.characterId === selectedId);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const scheduleStyle = (write) => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(write);
  };

  // Absolute children are positioned against the padding box, while
  // `getBoundingClientRect` reports the border box. The map host has a 1px
  // border, so skipping this drifts the panel by that border on every
  // open-and-close.
  const panelOffset = (panel, container) => {
    const panelBox = panel.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    return {
      left: panelBox.left - containerBox.left - container.clientLeft,
      top: panelBox.top - containerBox.top - container.clientTop,
      width: panelBox.width,
      height: panelBox.height,
    };
  };

  const applyFrame = (frame) => {
    const panel = panelRef.current;
    if (!panel || !frame) return;
    // `right` has to go: the panel is anchored to the right edge by default, and
    // leaving it set fights the left the drag worked out.
    panel.style.right = 'auto';
    panel.style.left = `${frame.left}px`;
    panel.style.top = `${frame.top}px`;
    // A frame with no size is a panel that was only ever moved. Writing pixels
    // here would replace the responsive default with a fixed width for good.
    if (frame.width !== null && frame.height !== null) {
      panel.style.width = `${frame.width}px`;
      panel.style.height = `${frame.height}px`;
    }
  };

  const rememberFrame = () => {
    writeSheetFrame(globalThis.sessionStorage, SHEET_FRAME_KEY, placementRef.current);
  };

  // Everything the gestures need before they start: where the panel is now, and
  // — only if it already carries one — the size it was given.
  const seedPlacement = () => {
    const panel = panelRef.current;
    const container = containerRef.current;
    if (!panel || !container) return null;
    const offset = panelOffset(panel, container);
    placementRef.current = {
      left: offset.left,
      top: offset.top,
      width: placementRef.current?.width ?? null,
      height: placementRef.current?.height ?? null,
    };
    return offset;
  };

  const fitToContainer = () => {
    const panel = panelRef.current;
    const container = containerRef.current;
    if (!panel || !container || !placementRef.current) return;
    const fitted = clampSheetFrame(
      placementRef.current,
      container.getBoundingClientRect(),
      panel.getBoundingClientRect(),
    );
    if (!fitted) return;
    placementRef.current = fitted;
    applyFrame(fitted);
  };

  // Before paint, so a reopened sheet does not appear at its default corner and
  // then jump.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const stored = readSheetFrame(globalThis.sessionStorage, SHEET_FRAME_KEY);
    if (stored) {
      placementRef.current = stored;
      fitToContainer();
    }

    // The map keeps changing size under an open sheet — the window is resized,
    // a tablet is rotated, fullscreen is toggled. Without this the panel keeps
    // a frame that fitted a container which no longer exists, and can end up
    // almost entirely off the right edge. It also covers the case where the
    // host had not been measured yet when this effect first ran.
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(() => fitToContainer());
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const beginDrag = (event) => {
    if (event.button !== 0 || event.target.closest?.('button, input, select, [role="button"]')) return;
    const offset = seedPlacement();
    if (!offset) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: offset.left,
      top: offset.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    const panel = panelRef.current;
    const container = containerRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !panel || !container) return;
    const bounds = container.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    // Leave enough of the title bar reachable, but allow the rest to move off
    // either side or below the viewport when the GM wants the map back. The
    // limits are shared with the restore, so a frame cannot come back somewhere
    // the drag would not have allowed it to go.
    const left = clamp(
      drag.left + event.clientX - drag.startX,
      -panelBox.width + SHEET_VISIBLE_GRIP,
      bounds.width - SHEET_VISIBLE_GRIP,
    );
    const top = clamp(
      drag.top + event.clientY - drag.startY,
      0,
      Math.max(0, bounds.height - SHEET_VISIBLE_HEADER),
    );
    // Recorded as the gesture decides it, so what gets stored never depends on
    // whether the queued style write has run.
    placementRef.current = { ...placementRef.current, left: Math.round(left), top: Math.round(top) };
    scheduleStyle(() => {
      panel.style.right = 'auto';
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    });
  };

  const endDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    rememberFrame();
  };

  const beginResize = (event) => {
    if (event.button !== 0) return;
    // Seeded here too: a player may resize before ever moving the panel, and
    // the stored frame still has to carry where it sits.
    const offset = seedPlacement();
    if (!offset) return;
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: offset.width,
      height: offset.height,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const moveResize = (event) => {
    const resize = resizeRef.current;
    const panel = panelRef.current;
    const container = containerRef.current;
    if (!resize || resize.pointerId !== event.pointerId || !panel || !container) return;
    const bounds = container.getBoundingClientRect();
    const maxWidth = bounds.width * MAX_SHEET_WIDTH_RATIO;
    const maxHeight = bounds.height * MAX_SHEET_HEIGHT_RATIO;
    const width = clamp(
      resize.width + event.clientX - resize.startX,
      Math.min(MIN_SHEET_WIDTH, maxWidth),
      maxWidth,
    );
    const height = clamp(
      resize.height + event.clientY - resize.startY,
      Math.min(MIN_SHEET_HEIGHT, maxHeight),
      maxHeight,
    );
    // This is the gesture that gives the frame a size at all.
    placementRef.current = {
      ...placementRef.current,
      width: Math.round(width),
      height: Math.round(height),
    };
    scheduleStyle(() => {
      panel.style.width = `${Math.round(width)}px`;
      panel.style.height = `${Math.round(height)}px`;
    });
  };

  const endResize = (event) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    rememberFrame();
  };

  return (
    <Box
      ref={panelRef}
      data-viewport-control
      data-floating-sheet
      sx={panelSx}
    >
      <Stack
        direction="row"
        spacing={0.75}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        sx={headerSx}
      >
        <GripHorizontal size={ICON_SIZES.sm} aria-hidden="true" />
        <Typography sx={titleSx}>Sheet</Typography>
        <Box sx={{ flex: 1 }} />
        {choices.length > 1 || (choices.length && !picked) ? (
          // Native, so its list opens inside a fullscreen map too. No
          // character picked: a stat block is on show.
          <SelectField
            native
            ariaLabel="Character sheet"
            value={picked ? selectedId : ''}
            onChange={onSelectionChange}
            placeholder="Character…"
            options={choices.map((entry) => ({ value: entry.characterId, label: entry.name }))}
            fullWidth={false}
            onMap
            sx={selectSx}
          />
        ) : null}
        <IconButton size="small" aria-label="Close floating sheet" onClick={onClose} sx={closeSx}>
          <X size={ICON_SIZES.sm} />
        </IconButton>
      </Stack>
      <Box sx={contentSx}>{children}</Box>
      <IconButton
        size="small"
        aria-label="Resize floating sheet"
        onPointerDown={beginResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        sx={resizeHandleSx}
      >
        <MoveDiagonal2 size={ICON_SIZES.sm} />
      </IconButton>
    </Box>
  );
}

const panelSx = {
  ...SURFACES.map,
  position: 'absolute',
  top: 50,
  right: 12,
  zIndex: LAYERS.mapFloating,
  width: 'min(620px, calc(100% - 24px))',
  height: 'min(70dvh, calc(100% - 68px))',
  // Keep the window margins on phones even below the desktop size floors.
  minHeight: `min(${MIN_SHEET_HEIGHT}px, calc(100% - 68px))`,
  minWidth: `min(${MIN_SHEET_WIDTH}px, calc(100% - 24px))`,
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr)',
  borderRadius: 1.25,
  bgcolor: VTT_COLORS.surface,
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  boxShadow: UI_SHADOWS.overlay,
  overflow: 'hidden',
  cursor: 'default',
  contain: 'layout paint',
  isolation: 'isolate',
};

const headerSx = {
  // What the drag clamp promises to leave on screen, so the two cannot drift.
  minHeight: SHEET_VISIBLE_HEADER,
  px: 1,
  alignItems: 'center',
  ...LIST_ROW_RULE_SX,
  color: VTT_COLORS.textSecondary,
  cursor: 'move',
  touchAction: 'none',
  userSelect: 'none',
};

const titleSx = {
  color: VTT_COLORS.accent,
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.md,
  
};

const selectSx = { width: { xs: 145, sm: 220 } };

const closeSx = {
  color: VTT_COLORS.textSecondary,
  '&:hover': { color: VTT_COLORS.accentHighlight, bgcolor: vttAlpha(VTT_COLORS.accent, OPACITY.soft) },
};

const contentSx = {
  minWidth: 0,
  minHeight: 0,
  overflow: 'auto',
  // Contained (no scroll chaining to the map) and without Chrome's stretch at
  // the ends, which pulled the sheet's dice handle with it.
  overscrollBehavior: 'none',
  '& > *': {
    width: '100%',
    maxWidth: 760,
    mx: 'auto',
  },
};

const resizeHandleSx = {
  position: 'absolute',
  right: 1,
  bottom: 1,
  zIndex: 2,
  width: 28,
  height: 28,
  borderRadius: cornerRadius(1, 0, 1, 0),
  color: VTT_COLORS.textSecondary,
  bgcolor: vttAlpha(VTT_COLORS.surface, OPACITY.veil),
  cursor: 'nwse-resize',
  touchAction: 'none',
  '&:hover': { color: VTT_COLORS.accentHighlight, bgcolor: vttAlpha(VTT_COLORS.accent, OPACITY.tint) },
};
