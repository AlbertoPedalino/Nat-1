import { Box } from '@mui/material';
import { Archive, Backpack, Check, Gem, Shield, Sparkles, Swords } from 'lucide-react';
import { ITEM_GROUP_CHIPS, ITEM_STATE_CHIPS } from './itemGroups.js';
import FilterToggles from '../../ui/FilterToggles.jsx';

// The chips over an item list, the same on the sheet and in the builder: the
// shelf (All, Weapons, Armor, Gear, Magic: several at once, All for every
// item; `value` is the list chosen, `onChange` gets the next list) and, for items you
// own, their states beside it (Equipped, Attuned, Stashed: any of them, all
// must hold). The shared taxonomy (itemGroups.js) with an icon each.
export const ITEM_GROUP_ICONS = Object.freeze({
  weapon: Swords, armor: Shield, gear: Backpack, magic: Sparkles, equipped: Check, attuned: Gem, stashed: Archive,
});

const withIcons = (chips) => chips.map((chip) => ({ ...chip, icon: ITEM_GROUP_ICONS[chip.key] || null }));

// `states` (the keys on) with `onStatesChange(list)` adds the owned-item
// states, after a gap; without them it is the shelf alone (an item database).
export default function ItemGroupFilter({ value, onChange, states = null, onStatesChange, sx }) {
  const toggleState = (key) => onStatesChange(states.includes(key) ? states.filter((on) => on !== key) : [...states, key]);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mb: 0.5, ...sx }}>
      <FilterToggles options={withIcons(ITEM_GROUP_CHIPS)} values={value} onChange={onChange} />
      {states ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: { sm: 1 } }}>
          <FilterToggles options={withIcons(ITEM_STATE_CHIPS)} isOn={(key) => states.includes(key)} onChange={toggleState} />
        </Box>
      ) : null}
    </Box>
  );
}
