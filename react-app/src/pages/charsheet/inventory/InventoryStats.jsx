import { useMemo } from 'react';
import { Box } from '@mui/material';
import { getFinal } from '../../../shared/character/sheet/sheetStats.js';
import { countAttunedItems } from '../../../shared/character/inventory/itemAttunement.js';
import {
  carryCapacity,
  formatWeight,
  itemQty as qty,
  totalCarriedWeight,
} from '../../../shared/character/inventory/weight.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

const statPillSx = {
  ...SURFACES.panel,
  px: '10px',
  py: '4px',
  fontSize: FONT_SIZES.xl,
  color: 'text.secondary',
  '& b': { color: UI_COLORS.accentText, fontFamily: UI_FONTS.display },
};

// Carried weight against capacity, total value and attuned items, with the
// encumbrance bar under them.
export default function InventoryStats({ inv, currency, character: C, attunementLimit }) {
  const { totalWeight, totalGp } = useMemo(() => ({
    totalWeight: totalCarriedWeight(inv, currency),
    totalGp: inv.reduce((sum, item) => sum + (Number(item.value || 0) / 100) * qty(item), 0),
  }), [inv, currency]);
  const maxCarry = useMemo(() => carryCapacity(getFinal(C, 'str')), [C]);
  const carryPct = Math.min(100, (totalWeight / maxCarry) * 100);
  const overloaded = totalWeight > maxCarry;
  const attunedCount = countAttunedItems(inv);
  const over = attunedCount > attunementLimit;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
      <Box sx={statPillSx}>Weight: <b>{formatWeight(totalWeight)} / {formatWeight(maxCarry)} lb</b></Box>
      <Box sx={statPillSx}>Value: <b>{totalGp.toFixed(1)} GP</b></Box>
      <Box sx={{ ...statPillSx, bgcolor: over ? uiAlpha(UI_COLORS.danger, OPACITY.tint) : UI_COLORS.surfaceHeader, borderColor: over ? UI_COLORS.danger : 'divider', '& b': { color: over ? UI_COLORS.danger : UI_COLORS.accentText, fontFamily: UI_FONTS.display } }}>
        Attuned: <b>{attunedCount} / {attunementLimit}</b>{over ? ' (over limit)' : ''}
      </Box>
      <Box sx={{ width: '100%', mt: 0.3 }}>
        <Box sx={{ ...SURFACES.wash, height: 6, overflow: 'hidden' }}>
          <Box sx={{ width: `${carryPct}%`, height: '100%', bgcolor: overloaded ? UI_COLORS.danger : UI_COLORS.success }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: FONT_SIZES.sm, mt: 0.25 }}>
          <Box sx={{ color: 'text.secondary', fontFamily: UI_FONTS.display }}>{formatWeight(totalWeight)} / {formatWeight(maxCarry)} lb</Box>
          <Box sx={{ px: 0.75, py: '1px', borderRadius: 1, bgcolor: overloaded ? uiAlpha(UI_COLORS.danger, OPACITY.fill) : uiAlpha(UI_COLORS.success, OPACITY.fill), color: overloaded ? UI_COLORS.danger : UI_COLORS.success, ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xs }}>
            {overloaded ? 'Over Capacity' : 'OK'}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
