import { useEffect, useRef } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { GripHorizontal, MoveDiagonal2, X } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { battleMapSurfaceSx } from './battleMapSurface.js';

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

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const scheduleStyle = (write) => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(write);
  };

  const beginDrag = (event) => {
    if (event.button !== 0 || event.target.closest?.('button, input, select, [role="button"]')) return;
    const panel = panelRef.current;
    const container = containerRef.current;
    if (!panel || !container) return;
    const panelBox = panel.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: panelBox.left - containerBox.left,
      top: panelBox.top - containerBox.top,
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
    // either side or below the viewport when the GM wants the map back.
    const visibleGrip = 96;
    const left = clamp(
      drag.left + event.clientX - drag.startX,
      -panelBox.width + visibleGrip,
      bounds.width - visibleGrip,
    );
    const top = clamp(drag.top + event.clientY - drag.startY, 0, Math.max(0, bounds.height - 40));
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
  };

  const beginResize = (event) => {
    if (event.button !== 0) return;
    const panel = panelRef.current;
    if (!panel) return;
    const box = panel.getBoundingClientRect();
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: box.width,
      height: box.height,
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
    const width = clamp(resize.width + event.clientX - resize.startX, 340, Math.max(340, bounds.width * 0.94));
    const height = clamp(resize.height + event.clientY - resize.startY, 260, Math.max(260, bounds.height * 0.92));
    scheduleStyle(() => {
      panel.style.width = `${Math.round(width)}px`;
      panel.style.height = `${Math.round(height)}px`;
    });
  };

  const endResize = (event) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
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
        <GripHorizontal size={15} aria-hidden="true" />
        <Typography sx={titleSx}>Sheet</Typography>
        <Box sx={{ flex: 1 }} />
        {choices.length > 1 ? (
          <Box
            component="select"
            aria-label="Character sheet"
            value={selectedId || ''}
            onChange={(event) => onSelectionChange(event.target.value)}
            sx={selectSx}
          >
            {choices.map((entry) => (
              <option key={entry.characterId} value={entry.characterId}>
                {entry.name}
              </option>
            ))}
          </Box>
        ) : null}
        <IconButton size="small" aria-label="Close floating sheet" onClick={onClose} sx={closeSx}>
          <X size={15} />
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
        <MoveDiagonal2 size={15} />
      </IconButton>
    </Box>
  );
}

function clamp(value, lower, upper) {
  return Math.max(lower, Math.min(upper, value));
}

const panelSx = {
  ...battleMapSurfaceSx,
  position: 'absolute',
  top: 50,
  right: 12,
  zIndex: 10,
  width: 'min(620px, calc(100% - 24px))',
  height: 'min(70vh, calc(100% - 68px))',
  minHeight: 280,
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr)',
  borderRadius: 1.25,
  bgcolor: vttAlpha(VTT_COLORS.sheetSurface, 0.96),
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  boxShadow: `0 18px 52px ${vttAlpha(VTT_COLORS.black, 0.68)}`,
  overflow: 'hidden',
  cursor: 'default',
  contain: 'layout paint',
  isolation: 'isolate',
};

const headerSx = {
  minHeight: 40,
  px: 1,
  alignItems: 'center',
  borderBottom: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.22)}`,
  color: VTT_COLORS.panelTextSoft,
  cursor: 'move',
  touchAction: 'none',
  userSelect: 'none',
};

const titleSx = {
  color: VTT_COLORS.gold,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
};

const selectSx = {
  width: { xs: 145, sm: 220 },
  height: 30,
  px: 0.75,
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.28)}`,
  borderRadius: 1,
  outline: 0,
  bgcolor: VTT_COLORS.selectSurface,
  color: VTT_COLORS.selectText,
  fontFamily: 'inherit',
  fontSize: '0.7rem',
  cursor: 'pointer',
  '&:focus': { borderColor: vttAlpha(VTT_COLORS.gold, 0.72) },
  '& option': { bgcolor: VTT_COLORS.selectSurface, color: VTT_COLORS.selectText },
};

const closeSx = {
  color: VTT_COLORS.panelTextSoft,
  '&:hover': { color: VTT_COLORS.goldUiBright, bgcolor: vttAlpha(VTT_COLORS.gold, 0.08) },
};

const contentSx = {
  minWidth: 0,
  minHeight: 0,
  overflow: 'auto',
  overscrollBehavior: 'contain',
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
  borderRadius: '8px 0 8px 0',
  color: VTT_COLORS.panelTextSoft,
  bgcolor: vttAlpha(VTT_COLORS.sheetSurface, 0.78),
  cursor: 'nwse-resize',
  touchAction: 'none',
  '&:hover': { color: VTT_COLORS.goldUiBright, bgcolor: vttAlpha(VTT_COLORS.gold, 0.1) },
};
