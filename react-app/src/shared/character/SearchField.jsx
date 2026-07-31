import { IconButton, InputAdornment, TextField } from '@mui/material';
import { Search, X } from 'lucide-react';

// Single source of truth for every search bar in the app: leading magnifier,
// trailing clear "X" (shown only when there is text), and — crucially — the
// adornments go through `slotProps.input`. MUI 9 ignores the legacy `InputProps`,
// so funnelling all search fields through here prevents that bug from recurring.
//
// `onChange` receives the raw string value (not the event). Clearing calls
// `onChange('')`. Extra props are spread onto the underlying TextField.
export default function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  size = 'small',
  iconSize = 16,
  showSearchIcon = true,
  stopPropagation = false,
  sx,
  ...rest
}) {
  return (
    <TextField
      size={size}
      fullWidth
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      sx={sx}
      slotProps={{ input: {
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
