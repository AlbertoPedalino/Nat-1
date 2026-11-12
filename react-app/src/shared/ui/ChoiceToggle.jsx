import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { FONT_SIZES } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';

// One choice among a few, made on the spot (a spell level, a cost, a beast's
// form, a weapon, an HP mode): the theme's key bar with one key lit. The same
// look on the sheet, in the builder and in the dialogs. `options` are
// { value, label, disabled? }; `onChange` gets the new value only when it
// changes. `size` follows the panel ('sm', or 'xs' on a card); `wrap` lets a
// long list run onto more lines; `allowClear` lets the lit key be pressed
// again to choose nothing (`onChange(null)`). With `multiple` several keys
// can be lit: `value` is their list and `onChange(list, toggled)` names the
// one pressed. A row of filters is FilterToggles instead.
const KEY_SX = Object.freeze({
  ...TEXT_STYLES.title,
  minHeight: 0,
  py: 0.5,
  textTransform: 'none',
});
const SIZES = Object.freeze({
  sm: Object.freeze({ ...KEY_SX, px: 1.25, fontSize: FONT_SIZES.sm }),
  xs: Object.freeze({ ...KEY_SX, px: 1, fontSize: FONT_SIZES.xs }),
});

export default function ChoiceToggle({
  options, value, onChange, size = 'sm', wrap = false, multiple = false, allowClear = false, stopPropagation = false, ariaLabel, sx,
}) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive={!multiple}
      value={multiple ? (value || []) : (value ?? null)}
      aria-label={ariaLabel}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      onChange={(_, next) => {
        if (multiple) {
          const before = value || [];
          const toggled = next.find((key) => !before.includes(key)) ?? before.find((key) => !next.includes(key));
          onChange(next, toggled);
          return;
        }
        if (next == null) {
          if (allowClear && value != null) onChange(null);
          return;
        }
        if (next !== value) onChange(next);
      }}
      sx={[wrap && { flexWrap: 'wrap' }, sx]}
    >
      {options.map((option) => (
        <ToggleButton key={String(option.value)} value={option.value} disabled={option.disabled} sx={SIZES[size]}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
