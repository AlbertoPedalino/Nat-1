import { useCallback, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';

const FONT = '"Cinzel", Georgia, serif';

const btnSx = {
  fontSize: '0.7rem', fontFamily: FONT, minWidth: 24, px: 0.4, py: 0, lineHeight: 1.4,
  color: '#edd48a', borderColor: 'rgba(237,212,138,0.35)',
  '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.08)' },
};

const trackSx = {
  position: 'relative', flex: 1, height: 10,
  bgcolor: 'rgba(46,42,34,1)', borderRadius: 1,
  border: '1px solid', borderColor: 'rgba(202,165,80,0.25)',
  overflow: 'hidden', minWidth: 60, cursor: 'pointer', touchAction: 'none',
};

const fillSx = (pct) => ({
  position: 'absolute', top: 0, left: 0, height: '100%',
  width: `${pct}%`, bgcolor: '#edd48a', borderRadius: 1, pointerEvents: 'none',
});

const labelSx = {
  fontSize: '0.65rem', fontFamily: FONT, fontWeight: 700,
  color: '#edd48a', minWidth: 36, textAlign: 'center',
};

export default function ResourceBar({ value, max, onChange }) {
  const refs = useRef({ value, max, onChange });
  refs.current = { value, max, onChange };

  const applyFromPosition = useCallback((bar, clientX) => {
    const { max: m, value: v, onChange: cb } = refs.current;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
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
