import { useMemo } from 'react';
import { Box } from '@mui/material';
import { getFinal } from '../../../shared/character/sheet/sheetStats.js';
import { countAttunedItems } from '../../../shared/character/inventory/itemAttunement.js';
import {
  carryCapacity,
  formatPounds,
  formatWeight,
  itemQty,
  totalCarriedWeight,
} from '../../../shared/character/inventory/weight.js';
import { UI_COLORS, OPACITY } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES, tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { tileSx } from '../../../shared/ui/interactive.js';
import { formatCopper } from '../../../shared/character/inventory/currency.js';

// A total read at the top of the inventory: flat.
const statPillSx = {
  ...tileSx(),
  px: 1.25,
  py: 0.5,
  fontSize: FONT_SIZES.xl,
  color: 'text.secondary',
  '& b': { color: UI_COLORS.accentText, fontFamily: UI_FONTS.display },
};

// Carried weight against capacity, total value and attuned items, with the
// encumbrance bar under them.
export default function InventoryStats({ inv, currency, character: C, attunementLimit }) {
  const { totalWeight, totalCopper } = useMemo(() => ({
    totalWeight: totalCarriedWeight(inv, currency),
    totalCopper: inv.reduce((sum, item) => sum + (Number(item.value) || 0) * itemQty(item), 0),
  }), [inv, currency]);
  const maxCarry = useMemo(() => carryCapacity(getFinal(C, 'str')), [C]);
  const carryPct = Math.min(100, (totalWeight / maxCarry) * 100);
  const overloaded = totalWeight > maxCarry;
  const attunedCount = countAttunedItems(inv);
  const over = attunedCount > attunementLimit;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
      <Box sx={statPillSx}>Weight: <b>{formatWeight(totalWeight)} / {formatPounds(maxCarry)}</b></Box>
      <Box sx={statPillSx}>Value: <b>{formatCopper(totalCopper) || '0 gp'}</b></Box>
      <Box sx={{ ...statPillSx, ...(over ? tintedSurfaceSx(UI_COLORS.danger, { base: UI_COLORS.surfaceHeader }) : null), borderColor: over ? UI_COLORS.danger : 'divider', '& b': { color: over ? UI_COLORS.danger : UI_COLORS.accentText, fontFamily: UI_FONTS.display } }}>
        Attuned: <b>{attunedCount} / {attunementLimit}</b>{over ? ' (over limit)' : ''}
      </Box>
      <Box sx={{ width: '100%', mt: 0.25 }}>
        <Box sx={{ ...SURFACES.wash, height: 6, overflow: 'hidden' }}>
          <Box sx={{ width: `${carryPct}%`, height: '100%', bgcolor: overloaded ? UI_COLORS.danger : UI_COLORS.success }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: FONT_SIZES.sm, mt: 0.25 }}>
          <Box sx={{ color: 'text.secondary', fontFamily: UI_FONTS.display }}>{formatWeight(totalWeight)} / {formatPounds(maxCarry)}</Box>
          <Box sx={{ px: 0.75, py: 0.25, borderRadius: 1, ...tintedSurfaceSx(overloaded ? UI_COLORS.danger : UI_COLORS.success, { amount: OPACITY.fill }), color: overloaded ? UI_COLORS.danger : UI_COLORS.success, ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xs }}>
            {overloaded ? 'Over Capacity' : 'OK'}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
