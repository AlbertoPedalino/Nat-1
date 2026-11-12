import { Box, Slider, Typography } from '@mui/material';
import { CONTROL_LABEL_SX } from './controlLabel.js';

// A value picked by dragging (a mark's size, a line's thickness, a light
// filter's strength): its name and value written over the slider, the one
// slider look in the app. Change how a slider reads here, not at each one.
//
// `label` is written over the slider and names it; `valueText` is the value
// as it should read beside the name ("20 ft", "×2", "1.5"). Without a
// `valueText` the value shows in the slider's own bubble while it is dragged.
// `ariaLabel` names the slider when it must say more than the label ("Icon
// stroke width" under "Stroke"), or when there is no label because a section
// title above already says what it is. `onChange` gets the value while it
// moves; `onCommit`, when given, gets it once the hand lets go (for a write
// that should not happen on every step). `marks` writes the given values
// under the track ([{ value, label }]: the builder's score sliders mark their
// floor and ceiling), lettered like the label. `sx` places it (a margin).
//
// The track is inset by the thumb's half on each side, so the thumb is not cut
// off at the ends inside a scrolling panel.
const SLIDER_SX = Object.freeze({
  mx: 0.5,
  width: 'calc(100% - 8px)',
  '& .MuiSlider-markLabel': { ...CONTROL_LABEL_SX, color: 'text.secondary' },
});

export default function LabeledSlider({
  label,
  valueText,
  ariaLabel,
  value,
  min,
  max,
  step,
  marks,
  onChange,
  onCommit,
  disabled = false,
  sx,
}) {
  return (
    <Box sx={sx}>
      {label ? (
        <Typography sx={CONTROL_LABEL_SX}>{valueText == null ? label : `${label} ${valueText}`}</Typography>
      ) : null}
      <Slider
        size="small"
        aria-label={ariaLabel ?? label}
        min={min}
        max={max}
        step={step}
        marks={marks}
        value={value}
        disabled={disabled}
        valueLabelDisplay={valueText == null ? 'auto' : 'off'}
        onChange={(_, next) => onChange(next)}
        onChangeCommitted={onCommit ? (_, next) => onCommit(next) : undefined}
        sx={SLIDER_SX}
      />
    </Box>
  );
}
