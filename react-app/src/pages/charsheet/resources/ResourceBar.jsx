import { useCallback, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { clamp } from '../../../shared/numbers.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import SegmentedMeter from '../../../shared/ui/SegmentedMeter.jsx';
import { METER_SEGMENTS } from '../../../shared/ui/shapes.js';

// The bar and its figure, side by side between the stepper's buttons.
const barRowSx = { display: 'flex', alignItems: 'center', gap: 0.5 };

// The bar is the app's meter (SegmentedMeter), dragged to set: its share
// follows the finger without a style rule per value.
const trackSx = { flex: 1, minWidth: 60, cursor: 'pointer', touchAction: 'none' };

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

  // The stepper's − and + flank the bar: one control, so a resource is changed
  // the same way as any other count.
  return (
    <CountStepper
      fullWidth
      label="uses"
      canDecrease={value > 0}
      canIncrease={value < max}
      onStep={onChange}
      value={(
        <Box sx={barRowSx}>
          <SegmentedMeter
            ratio={max > 0 ? value / max : 0}
            tone={UI_COLORS.accentText}
            segments={METER_SEGMENTS.smooth}
            title="Uses"
            valueText={`${value} of ${max} uses`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            sx={trackSx}
          />
          <Typography sx={labelSx}>{value}/{max}</Typography>
        </Box>
      )}
    />
  );
}
