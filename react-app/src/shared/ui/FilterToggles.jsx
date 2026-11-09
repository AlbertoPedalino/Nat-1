import { Button } from '@mui/material';
import { goldToggleSx } from './actionButton.js';

// One row of filter choices (the sheet's Actions, Spells and Inventory tabs):
// the chosen one lit in gold. `options` are { key, label, icon? }; the buttons
// are returned bare, to sit in whatever toolbar holds them.
export default function FilterToggles({ options, value, onChange }) {
  return options.map(({ key, label, icon: Icon }) => (
    <Button
      key={key}
      size="small"
      aria-pressed={value === key}
      onClick={() => onChange(key)}
      startIcon={Icon ? <Icon size={12} /> : null}
      sx={goldToggleSx(value === key)}
    >
      {label}
    </Button>
  ));
}
