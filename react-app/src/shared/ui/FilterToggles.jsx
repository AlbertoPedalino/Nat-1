import { Button, Tooltip } from '@mui/material';
import { goldToggleSx } from './actionButton.js';
import { ICON_SIZES } from './iconSizes.js';
import { isToggleOn, toggleChoice } from './toggleChoices.js';

// One row of filter choices (the sheet's Actions, Spells and Inventory tabs,
// the compendium's kinds, the bestiary's books): the chosen ones lit in gold.
// `options` are { key, label, icon?, tooltip? }. Several can be on at once:
// `values` is the list of chosen keys and `onChange` gets the next list
// (toggleChoices.js: the "All" option, key 'all', stands for none chosen and
// clears the rest). For any other rule (the books on by default) pass `isOn`
// and `onChange` gets the key pressed. The buttons are returned bare, to sit
// in whatever toolbar holds them.
export default function FilterToggles({ options, values, isOn: isOnRule, onChange }) {
  const several = values !== undefined;
  const isOn = several ? (key) => isToggleOn(values, key) : isOnRule;
  const press = several ? (key) => onChange(toggleChoice(values, key)) : onChange;
  return options.map(({ key, label, icon: Icon, tooltip }) => {
    const button = (
      <Button
        key={key}
        size="small"
        aria-pressed={isOn(key)}
        onClick={() => press(key)}
        startIcon={Icon ? <Icon size={ICON_SIZES.xs} /> : null}
        sx={goldToggleSx(isOn(key))}
      >
        {label}
      </Button>
    );
    return tooltip ? <Tooltip key={key} title={tooltip}>{button}</Tooltip> : button;
  });
}
