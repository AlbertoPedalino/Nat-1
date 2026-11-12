import { Checkbox, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import InfoHint from './InfoHint.jsx';
import { CONTROL_HEIGHTS } from './controlHeights.js';
import { CONTROL_LABEL_SX } from './controlLabel.js';

// One thing switched on or off, with its name beside it ("Hidden from the
// players", "Objects snap to the grid", "GM layer"): the label is the
// control's accessible name. One row everywhere, so a change to how an on/off
// setting reads is made here.
//
// `onChange` gets the new state (a boolean), not the event. `control` is
// 'switch' (a setting that stays: the default) or 'checkbox' (a mark on a
// thing, in a menu). `hint` puts an InfoHint after the row, named by
// `hintLabel` ("About snapping"), for the rule only met the first time.
// `dense` packs the row to a compact control's height with a smaller name,
// for a menu of many rows (the piece and drawing menus). `disabled` greys it.
// `sx` places the row (a margin), nothing else.
const DENSE_SX = Object.freeze({
  m: 0,
  minHeight: CONTROL_HEIGHTS.md,
  '& .MuiCheckbox-root': { p: 0.25, mr: 0.25 },
  '& .MuiSvgIcon-root': { width: 17, height: 17 },
});

// With a hint the row is as wide as its label, so the hint sits right after it.
const WITH_HINT_SX = Object.freeze({ mr: 0 });

export default function ToggleRow({
  label,
  checked,
  onChange,
  control = 'switch',
  hint,
  hintLabel,
  dense = false,
  disabled = false,
  sx,
}) {
  const Control = control === 'checkbox' ? Checkbox : Switch;
  const row = (
    <FormControlLabel
      disabled={disabled}
      control={(
        <Control
          size="small"
          checked={Boolean(checked)}
          onChange={(event) => onChange(event.target.checked)}
        />
      )}
      label={dense
        ? <Typography sx={CONTROL_LABEL_SX}>{label}</Typography>
        : <Typography variant="body2">{label}</Typography>}
      sx={[dense && DENSE_SX, hint ? WITH_HINT_SX : sx]}
    />
  );
  if (!hint) return row;
  return (
    <Stack direction="row" spacing={0.5} sx={[{ alignItems: 'center' }, sx]}>
      {row}
      <InfoHint label={hintLabel} text={hint} />
    </Stack>
  );
}
