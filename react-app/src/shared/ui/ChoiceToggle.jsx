import { Box, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { FONT_SIZES } from './fonts.js';
import { ICON_SIZES } from './iconSizes.js';
import { SURFACES } from './surfaces.js';
import { VTT_COLORS } from '../vtt/colors.js';

// One choice among a few, made on the spot (a spell level, a cost, a beast's
// form, a weapon, an HP mode, a map tool): the theme's key bar with one key
// lit. The same look on the sheet, in the builder, in the dialogs and on the
// map. `options` are { value, label?, icon?, tooltip?, ariaLabel?, color?,
// disabled? } (`color` lights the key in 'error' or 'success' instead of gold):
// a key shows its icon, its label, or both; an icon-only key is named by its
// tooltip or ariaLabel. `onChange` gets the new value only when it changes.
//
// `size` follows the panel ('sm', or 'xs' on a card); `wrap` lets a long list
// run onto more lines; `fullWidth` shares the row out between the keys;
// `onMap` sets the bar straight on the battle map, as its other controls.
// `allowClear` lets the lit key be pressed again to choose nothing
// (`onChange(null)`). With `multiple` several keys can be lit: `value` is
// their list and `onChange(list, toggled)` names the one pressed. A row of
// filters is FilterToggles instead.
const KEY_SX = Object.freeze({
  minHeight: 0,
  py: 0.5,
  gap: 0.5,
});
const SIZES = Object.freeze({
  sm: Object.freeze({ ...KEY_SX, px: 1.25, fontSize: FONT_SIZES.sm }),
  xs: Object.freeze({ ...KEY_SX, px: 1, fontSize: FONT_SIZES.xs }),
});
const ON_MAP_SX = Object.freeze({
  ...SURFACES.mapControl,
  '& .MuiToggleButton-root': { border: 0, px: 1 },
  '& .MuiToggleButton-root:not(.Mui-selected)': { color: VTT_COLORS.textSecondary },
});

export default function ChoiceToggle({
  options,
  value,
  onChange,
  size = 'sm',
  wrap = false,
  fullWidth = false,
  onMap = false,
  multiple = false,
  allowClear = false,
  disabled = false,
  stopPropagation = false,
  ariaLabel,
  sx,
}) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive={!multiple}
      fullWidth={fullWidth}
      disabled={disabled}
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
      sx={[wrap && { flexWrap: 'wrap' }, onMap && ON_MAP_SX, sx]}
    >
      {options.map((option) => {
        const { icon: Icon } = option;
        const key = (
          <ToggleButton
            key={String(option.value)}
            value={option.value}
            disabled={option.disabled}
            color={option.color}
            aria-label={option.ariaLabel ?? (option.label == null ? option.tooltip : undefined)}
            sx={SIZES[size]}
          >
            {Icon ? <Icon size={ICON_SIZES.sm} aria-hidden /> : null}
            {option.label != null ? <Box component="span">{option.label}</Box> : null}
          </ToggleButton>
        );
        return option.tooltip ? <Tooltip key={String(option.value)} title={option.tooltip}>{key}</Tooltip> : key;
      })}
    </ToggleButtonGroup>
  );
}
