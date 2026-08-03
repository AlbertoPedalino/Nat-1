import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { GripVertical } from 'lucide-react';
import {
  DEFAULT_SHEET_SPLIT,
  MAX_MAP_SPLIT,
  MIN_MAP_SPLIT,
  normalizeSheetSplit,
  sheetGridColumns,
  sheetSplitAtPointer,
} from '../../../shared/vtt/sheetLayout.js';

export default function BattleMapSheetResizeHandle({ containerRef, value, onCommit }) {
  const pointerRef = useRef(null);
  const frameRef = useRef(0);
  const previewRef = useRef(value);

  const applyPreview = (next) => {
    previewRef.current = next;
    containerRef.current?.style.setProperty('--sheet-grid-columns', sheetGridColumns(next));
  };

  const schedulePreview = (next) => {
    previewRef.current = next;
    if (frameRef.current) return;
    if (typeof requestAnimationFrame !== 'function') {
      applyPreview(next);
      return;
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      applyPreview(previewRef.current);
    });
  };

  useEffect(() => () => {
    if (frameRef.current && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);

  const valueAt = (clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? sheetSplitAtPointer(clientX, rect.left, rect.width) : value;
  };

  const handlePointerDown = (event) => {
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    schedulePreview(valueAt(event.clientX));
    event.preventDefault();
  };

  const handlePointerMove = (event) => {
    if (pointerRef.current !== event.pointerId) return;
    schedulePreview(valueAt(event.clientX));
  };

  const finishPointer = (event) => {
    if (pointerRef.current !== event.pointerId) return;
    const next = valueAt(event.clientX);
    pointerRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (frameRef.current && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    applyPreview(next);
    onCommit(next);
  };

  const handleKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    const next = event.key === 'Home'
      ? DEFAULT_SHEET_SPLIT
      : normalizeSheetSplit(value + (event.key === 'ArrowLeft' ? -2 : 2));
    applyPreview(next);
    onCommit(next);
    event.preventDefault();
  };

  const reset = () => {
    applyPreview(DEFAULT_SHEET_SPLIT);
    onCommit(DEFAULT_SHEET_SPLIT);
  };

  return (
    <Box
      role="separator"
      aria-label="Resize map and character sheet"
      aria-orientation="vertical"
      aria-valuemin={MIN_MAP_SPLIT}
      aria-valuemax={MAX_MAP_SPLIT}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onDoubleClick={reset}
      onKeyDown={handleKeyDown}
      sx={handleSx}
    >
      <GripVertical size={15} />
    </Box>
  );
}

const handleSx = {
  display: { xs: 'none', lg: 'flex' },
  alignSelf: 'stretch',
  minHeight: 120,
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(232, 201, 106, 0.62)',
  cursor: 'col-resize',
  touchAction: 'none',
  userSelect: 'none',
  borderRadius: 1,
  background: 'linear-gradient(90deg, transparent 42%, rgba(232,201,106,0.3) 43%, rgba(232,201,106,0.3) 57%, transparent 58%)',
  transition: 'color 120ms ease, background-color 120ms ease',
  '&:hover, &:focus-visible': {
    color: '#f1d77d',
    bgcolor: 'rgba(232, 201, 106, 0.08)',
    outline: '1px solid rgba(232, 201, 106, 0.42)',
  },
};
