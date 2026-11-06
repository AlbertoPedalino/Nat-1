import { Box, Button } from '@mui/material';
import { Backpack, Check, Shield, Sparkles, Swords } from 'lucide-react';
import { ITEM_GROUP_CHIPS } from '../../../shared/character/inventory/itemGroups.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

// Controls and looks shared by the inventory tab's two sections: the add-item
// search and the owned inventory list.

// Keys and labels come from the shared chip taxonomy; the sheet only adds the
// icons, which are its own presentation. The add-item search gets the plain set
// (no "Equipped" — database items are not owned), the inventory the owned set.
export const CHIP_ICONS = { weapon: Swords, armor: Shield, gear: Backpack, magic: Sparkles, equipped: Check };
export const withIcons = (chips) => chips.map((chip) => ({ ...chip, icon: CHIP_ICONS[chip.key] || null }));

const FILTERS = withIcons(ITEM_GROUP_CHIPS);

export const compactInputSx = {
  '& .MuiOutlinedInput-root': { bgcolor: UI_COLORS.headerBg, borderRadius: 1 },
  '& input': { fontSize: '0.75rem', py: '7px' },
};

export const inventorySectionSx = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: uiAlpha(UI_COLORS.ink, 0.48),
  p: '8px',
  mb: 1,
};

const filterButtonSx = (active) => ({
  minHeight: 0,
  px: '10px',
  py: '3px',
  border: 1,
  borderColor: active ? UI_COLORS.gold : 'divider',
  borderRadius: 1,
  bgcolor: active ? uiAlpha(UI_COLORS.gold, 0.12) : 'transparent',
  color: active ? UI_COLORS.goldLight : 'text.secondary',
  fontFamily: UI_FONTS.display,
  fontSize: '0.56rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

export function ShowMoreButton({ remaining, onClick }) {
  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{ alignSelf: 'center', my: 0.5, px: '12px', py: '2px', border: 1, borderColor: 'divider', borderRadius: 1, color: 'text.secondary', fontFamily: UI_FONTS.display, fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', '&:hover': { borderColor: UI_COLORS.gold, color: UI_COLORS.gold } }}
    >
      Show more ({remaining})
    </Button>
  );
}

export function InventoryFilterButtons({ value, onChange, filters = FILTERS }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mb: 0.6 }}>
      {filters.map((filterDef) => {
        const Icon = filterDef.icon;
        const active = value === filterDef.key;
        return (
          <Button
            key={filterDef.key}
            size="small"
            onClick={() => onChange(filterDef.key)}
            startIcon={Icon ? <Icon size={12} /> : null}
            sx={filterButtonSx(active)}
          >
            {filterDef.label}
          </Button>
        );
      })}
    </Box>
  );
}
