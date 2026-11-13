import { Checkbox, ListItemText, MenuItem, TextField } from '@mui/material';
import { CONTROL_HEIGHTS } from './controlHeights.js';
import { FONT_SIZES } from './fonts.js';
import { OPACITY } from './colors.js';
import { VTT_COLORS, vttAlpha } from '../vtt/colors.js';

// Every drop-down in the app: one labelled field, one way to list its
// choices, one way to say what nothing chosen means. Change how a drop-down
// looks or behaves here, not at each one.
//
// `options` are { value, label, disabled? }; a label may be a node when the
// choice carries more than words (an effect's colour dot, a "Cloud" badge;
// text only in a `native` list).
// `onChange` gets the chosen value (not the event). With no choice made the
// field shows:
//   - `emptyOption`: a choice of its own that stands for "none" or "all"
//     ({ label: 'Local only' }, { label: 'All CR' }), whose value is `emptyValue`;
//   - `placeholder`: a prompt that cannot be picked ("Choose a GM Board").
// `helperText` explains it under the field. The field takes its row's width
// unless `fullWidth` is false; `sx` is for placement only.
//
// `multiple`: several choices at once; `value` is an array and `onChange` gets
// the array. The field names the first choice and how many more ("Large +2"),
// `placeholder` when there are none: it keeps its width however many are
// chosen, and so does its menu (as wide as the field at least). Each choice in
// the menu carries its check box, ticked while chosen (MUI's own pattern for a
// select of several, "Checkmarks"); the menu stays open to tick more.
// `native`: the browser's own list instead of a menu. A menu is portalled to
// the page body, which a fullscreen map does not paint; a native list opens
// over it.
// `stopPropagation`: clicks on the field and its menu stay in it, for a field
// inside a card that opens or collapses on click.
// `onMap`: set straight on the battle map, beside its other controls: their
// height, the map's dark wash behind it.
const ON_MAP_SX = Object.freeze({
  '& .MuiInputBase-root': {
    height: CONTROL_HEIGHTS.xl,
    fontSize: FONT_SIZES.md,
    bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.heavy),
  },
});

// The check box of a choice in a menu of several: tight to its label.
const CHECK_SX = Object.freeze({ p: 0, mr: 1 });

export default function SelectField({
  label,
  value,
  onChange,
  options,
  emptyOption,
  emptyValue = '',
  placeholder,
  helperText,
  disabled = false,
  fullWidth = true,
  multiple = false,
  native = false,
  stopPropagation = false,
  onMap = false,
  ariaLabel,
  sx,
}) {
  const current = multiple ? (Array.isArray(value) ? value : []) : (value ?? emptyValue);
  const showsPrompt = placeholder != null && !multiple && current === emptyValue;
  // A "none" choice or a prompt is shown in the field like any other value,
  // so the label sits above it rather than over it.
  const showsEmpty = placeholder != null || emptyOption != null;
  const Item = native ? 'option' : MenuItem;
  const labelOf = (chosen) => options.find((option) => option.value === chosen)?.label ?? chosen;
  return (
    <TextField
      select
      size="small"
      fullWidth={fullWidth}
      label={label}
      value={current}
      disabled={disabled}
      helperText={helperText}
      onChange={(event) => {
        const next = event.target.value;
        // Browser autofill hands a multiple select one comma-joined string.
        onChange(multiple && typeof next === 'string' ? next.split(',') : next);
      }}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      sx={[onMap && ON_MAP_SX, sx]}
      slotProps={{
        select: {
          native,
          multiple,
          displayEmpty: showsEmpty,
          renderValue: multiple
            ? (chosen) => (chosen.length
              ? <>{labelOf(chosen[0])}{chosen.length > 1 ? ` +${chosen.length - 1}` : ''}</>
              : placeholder)
            : undefined,
        },
        inputLabel: showsEmpty ? { shrink: true } : undefined,
        htmlInput: ariaLabel ? { 'aria-label': ariaLabel } : undefined,
      }}
    >
      {showsPrompt ? <Item value={emptyValue} disabled>{placeholder}</Item> : null}
      {emptyOption ? <Item value={emptyValue}>{emptyOption.label}</Item> : null}
      {options.map((option) => (
        <Item key={String(option.value)} value={option.value} disabled={option.disabled}>
          {multiple && !native ? (
            <>
              <Checkbox size="small" checked={current.includes(option.value)} sx={CHECK_SX} />
              <ListItemText primary={option.label} />
            </>
          ) : option.label}
        </Item>
      ))}
    </TextField>
  );
}
