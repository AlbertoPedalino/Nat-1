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
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { tileSx } from '../../../shared/ui/interactive.js';
import { formatCopper } from '../../../shared/character/inventory/currency.js';
import SegmentedMeter from '../../../shared/ui/SegmentedMeter.jsx';
import { METER_SEGMENTS } from '../../../shared/ui/shapes.js';

// A total read at the top of the inventory, flat: its name, then its figure.
// Past its limit (over capacity, more attuned items than allowed) it turns
// to the danger tone, edge, wash and figure alike. The three are one pill.
function StatPill({ label, value, over = false }) {
  return (
    <Box sx={{
      ...tileSx(),
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 0.75,
      px: 1.25,
      py: 0.5,
      fontSize: FONT_SIZES.xl,
      color: 'text.secondary',
      ...(over ? { ...tintedSurfaceSx(UI_COLORS.danger, { base: UI_COLORS.surfaceHeader }), borderColor: UI_COLORS.danger } : null),
    }}>
      {label}
      <Box component="span" sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xl, color: over ? UI_COLORS.danger : UI_COLORS.accentText }}>{value}</Box>
    </Box>
  );
}

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

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
      <StatPill label="Weight" value={`${formatWeight(totalWeight)} / ${formatPounds(maxCarry)}`} over={overloaded} />
      <StatPill label="Value" value={formatCopper(totalCopper) || '0 gp'} />
      <StatPill label="Attuned" value={`${attunedCount} / ${attunementLimit}`} over={attunedCount > attunementLimit} />
      {/* How full the pack is; the Weight pill above says by how much. */}
      <SegmentedMeter
        ratio={carryPct / 100}
        tone={overloaded ? UI_COLORS.danger : UI_COLORS.success}
        segments={METER_SEGMENTS.smooth}
        title="Carried weight"
        valueText={`${formatWeight(totalWeight)} of ${formatPounds(maxCarry)}`}
        sx={{ width: '100%', height: 8, mt: 0.25 }}
      />
    </Box>
  );
}
