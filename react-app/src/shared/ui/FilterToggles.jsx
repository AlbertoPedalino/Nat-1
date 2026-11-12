import { Button, Tooltip } from '@mui/material';
import { goldToggleSx } from './actionButton.js';
import { ICON_SIZES } from './iconSizes.js';

// One row of filter choices (the sheet's Actions, Spells and Inventory tabs,
// the compendium's kinds, the bestiary's books): the chosen ones lit in gold.
// `options` are { key, label, icon?, tooltip? }. `value` is the chosen key, or
// with `isOn` any rule for which keys are lit (several books at once);
// `onChange` gets the key pressed. The buttons are returned bare, to sit in
// whatever toolbar holds them.
export default function FilterToggles({ options, value, isOn = (key) => value === key, onChange }) {
  return options.map(({ key, label, icon: Icon, tooltip }) => {
    const button = (
      <Button
        key={key}
        size="small"
        aria-pressed={isOn(key)}
        onClick={() => onChange(key)}
        startIcon={Icon ? <Icon size={ICON_SIZES.xs} /> : null}
        sx={goldToggleSx(isOn(key))}
      >
        {label}
      </Button>
    );
    return tooltip ? <Tooltip key={key} title={tooltip}>{button}</Tooltip> : button;
  });
}
