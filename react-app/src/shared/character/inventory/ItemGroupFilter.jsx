import { Box } from '@mui/material';
import { Backpack, Check, Shield, Sparkles, Swords } from 'lucide-react';
import { ITEM_GROUP_CHIPS } from './itemGroups.js';
import FilterToggles from '../../ui/FilterToggles.jsx';

// The group chips over an item list (All, Weapons, Armor, Gear, Magic, and
// Equipped for owned items), the same on the sheet and in the builder: the
// shared chip taxonomy (itemGroups.js) with an icon each.
export const ITEM_GROUP_ICONS = Object.freeze({ weapon: Swords, armor: Shield, gear: Backpack, magic: Sparkles, equipped: Check });

const withIcons = (chips) => chips.map((chip) => ({ ...chip, icon: ITEM_GROUP_ICONS[chip.key] || null }));

// `chips` is ITEM_GROUP_CHIPS for an item database (no "Equipped": nothing
// there is owned) or OWNED_ITEM_CHIPS for an inventory.
export default function ItemGroupFilter({ value, onChange, chips = ITEM_GROUP_CHIPS, sx }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5, ...sx }}>
      <FilterToggles options={withIcons(chips)} value={value} onChange={onChange} />
    </Box>
  );
}
