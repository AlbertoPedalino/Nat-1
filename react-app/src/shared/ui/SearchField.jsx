import { IconButton, InputAdornment, TextField } from '@mui/material';
import { Search, X } from 'lucide-react';
import { COMPACT_INPUT_SX } from './controlHeights.js';
import { PART_ICON_BUTTON_SX } from './pressable.js';

// Single source of truth for every search bar in the app: leading magnifier,
// trailing clear "X" (shown only when there is text), and — crucially — the
// adornments go through `slotProps.input`. MUI 9 ignores the legacy `InputProps`,
// so funnelling all search fields through here prevents that bug from recurring.
//
// `onChange` receives the raw string value (not the event). Clearing — the X,
// or Escape in the field — calls `onChange('')`. Extra props are spread onto the underlying TextField.
//
// `density` sizes it for where it stands: 'standard' on a page or a dialog,
// 'compact' in the sheet's and the builder's dense panels and the cards on
// them. A field fronting a costly owner (a page reducer) is a
// DraftSearchField. `sx` is for placement only.
const DENSITIES = Object.freeze({
  standard: { iconSize: 16, inputSx: null },
  compact: { iconSize: 14, inputSx: COMPACT_INPUT_SX },
});

const NATIVE_CLEAR_HIDDEN_SX = Object.freeze({
  '& input::-webkit-search-cancel-button': { display: 'none' },
});

export default function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  size = 'small',
  density = 'standard',
  iconSize = DENSITIES[density].iconSize,
  showSearchIcon = true,
  stopPropagation = false,
  // The field's accessible name, when no visible label gives it one.
  ariaLabel,
  sx,
  onKeyDown,
  ...rest
}) {
  return (
    <TextField
      size={size}
      fullWidth
      // A search box to assistive technology; the browser's own clear button
      // is hidden in favour of the X below.
      type="search"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && value) {
          event.stopPropagation();
          onChange('');
        }
        onKeyDown?.(event);
      }}
      sx={[NATIVE_CLEAR_HIDDEN_SX, DENSITIES[density].inputSx, sx]}
      slotProps={{ htmlInput: ariaLabel ? { 'aria-label': ariaLabel } : undefined, input: {
        startAdornment: showSearchIcon ? (
          <InputAdornment position="start">
            <Search size={iconSize} />
          </InputAdornment>
        ) : undefined,
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              edge="end"
              aria-label="Clear search"
              sx={PART_ICON_BUTTON_SX}
              onClick={(event) => {
                if (stopPropagation) event.stopPropagation();
                onChange('');
              }}
            >
              <X size={iconSize} />
            </IconButton>
          </InputAdornment>
        ) : null,
      } }}
      {...rest}
    />
  );
}
