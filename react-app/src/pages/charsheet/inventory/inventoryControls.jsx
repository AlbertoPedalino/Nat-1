import { Box } from '@mui/material';
import { Backpack, Check, Shield, Sparkles, Swords } from 'lucide-react';
import { ITEM_GROUP_CHIPS } from '../../../shared/character/inventory/itemGroups.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import FilterToggles from '../../../shared/ui/FilterToggles.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

// Controls and looks shared by the inventory tab's two sections: the add-item
// search and the owned inventory list.

// Keys and labels come from the shared chip taxonomy; the sheet only adds the
// icons, which are its own presentation. The add-item search gets the plain set
// (no "Equipped" — database items are not owned), the inventory the owned set.
export const CHIP_ICONS = { weapon: Swords, armor: Shield, gear: Backpack, magic: Sparkles, equipped: Check };
export const withIcons = (chips) => chips.map((chip) => ({ ...chip, icon: CHIP_ICONS[chip.key] || null }));

const FILTERS = withIcons(ITEM_GROUP_CHIPS);

export const compactInputSx = {
  '& .MuiOutlinedInput-root': { bgcolor: UI_COLORS.surfaceHeader, borderRadius: 1 },
  '& input': { fontSize: FONT_SIZES.lg, py: 1 },
};

export const inventorySectionSx = {
  ...SURFACES.inset,
  p: 1,
  mb: 1,
};

export function InventoryFilterButtons({ value, onChange, filters = FILTERS }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
      <FilterToggles options={filters} value={value} onChange={onChange} />
    </Box>
  );
}
