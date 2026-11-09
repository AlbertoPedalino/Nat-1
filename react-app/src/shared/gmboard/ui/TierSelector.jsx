import { useTheme } from '@mui/material';
import { Circle } from 'lucide-react';
import { TIER_OPTIONS } from '../boardOptions.js';
import SelectorGroup from './SelectorGroup.jsx';
import { ICON_SIZES } from '../../ui/iconSizes.js';

// The encounter tier, each in its own colour (theme.palette.gmboard.tier): how
// the board says how hard the next hex, dungeon or quest is.
// `clearable`: clicking the tier already picked clears it (onChange(null)).
export default function TierSelector({ value, onChange, label = 'Tier', disabled = false, clearable = false }) {
  const tierColors = useTheme().palette.gmboard.tier;
  return (
    <SelectorGroup
      label={label}
      options={TIER_OPTIONS}
      getId={(option) => option.tier}
      getLabel={(option) => option.shortLabel}
      getSub={(option) => option.shortLevels}
      getIcon={() => TierDot}
      getTone={(option) => tierColors[option.tier]}
      value={value}
      disabled={disabled}
      onChange={(option) => onChange(clearable && value === option.tier ? null : option.tier)}
    />
  );
}

// The tier's dot, in the button's own colour.
function TierDot() {
  return <Circle size={ICON_SIZES.xxs} fill="currentColor" />;
}
