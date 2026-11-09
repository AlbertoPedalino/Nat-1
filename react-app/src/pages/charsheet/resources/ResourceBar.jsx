import { useCallback, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { clamp } from '../../../shared/numbers.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

const btnSx = {
  fontSize: FONT_SIZES.md, ...TEXT_STYLES.figure, minWidth: 24, px: 0.4, py: 0, lineHeight: 1.4,
  color: UI_COLORS.accentText, borderColor: uiAlpha(UI_COLORS.accentText, OPACITY.line),
  '&:hover': { borderColor: UI_COLORS.accentText, bgcolor: uiAlpha(UI_COLORS.accentText, OPACITY.soft) },
};

const trackSx = {
  position: 'relative', flex: 1, height: 10,
  bgcolor: UI_COLORS.surfaceRaised, borderRadius: 1,
  border: '1px solid', borderColor: uiAlpha(UI_COLORS.accent, OPACITY.shade),
  overflow: 'hidden', minWidth: 60, cursor: 'pointer', touchAction: 'none',
};

const fillSx = (pct) => ({
  position: 'absolute', top: 0, left: 0, height: '100%',
  width: `${pct}%`, bgcolor: UI_COLORS.accentText, borderRadius: 1, pointerEvents: 'none',
});

const labelSx = {
  fontSize: FONT_SIZES.sm, ...TEXT_STYLES.figure, color: UI_COLORS.accentText, minWidth: 36, textAlign: 'center',
};

export default function ResourceBar({ value, max, onChange }) {
  const refs = useRef({ value, max, onChange });
  refs.current = { value, max, onChange };

  const applyFromPosition = useCallback((bar, clientX) => {
    const { max: m, value: v, onChange: cb } = refs.current;
    const rect = bar.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const target = Math.round(ratio * m);
    const delta = target - v;
    if (delta !== 0) cb(delta);
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const bar = e.currentTarget;
    applyFromPosition(bar, e.clientX);
    const onMove = (ev) => applyFromPosition(bar, ev.clientX);
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [applyFromPosition]);

  const handleTouchStart = useCallback((e) => {
    e.stopPropagation();
    const bar = e.currentTarget;
    applyFromPosition(bar, e.touches[0].clientX);
    const onMove = (ev) => applyFromPosition(bar, ev.touches[0].clientX);
    const onEnd = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  }, [applyFromPosition]);

  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <>
      <Button size="small" variant="outlined" disabled={value <= 0}
        onClick={(e) => { e.stopPropagation(); onChange(-1); }} sx={btnSx}
      >−</Button>
      <Box onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} sx={trackSx}>
        <Box sx={fillSx(pct)} />
      </Box>
      <Typography sx={labelSx}>{value}/{max}</Typography>
      <Button size="small" variant="outlined" disabled={value >= max}
        onClick={(e) => { e.stopPropagation(); onChange(1); }} sx={btnSx}
      >+</Button>
    </>
  );
}
