import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { ItemPropertyTable } from './ItemPropertyTable.jsx';
import { WeaponMasteryBlock } from '../combat/WeaponMasteryBlock.jsx';
import { clampInt } from '../../numbers.js';
import CountStepper from '../../ui/CountStepper.jsx';
import { FONT_SIZES } from '../../ui/fonts.js';

// Read-only reference body for an item: property grid + rich-text entries
// (live 5etools entries from the items DB). Shared by the builder + sheet
// inventory rows so the expanded view stays identical everywhere.
// A weapon's mastery is always shown here as reference (unlike the Actions tab,
// which only surfaces it when the character actually has that mastery).
export function ItemReferenceBody({ item, fontSize = FONT_SIZES.md, sx }) {
  const hasEntries = Array.isArray(item?.entries) && item.entries.length > 0;
  return (
    <Box sx={sx}>
      <ItemPropertyTable item={item} sx={{ mb: hasEntries ? '6px' : 0 }} />
      {hasEntries ? (
        <EntryBlocks
          entries={item.entries}
          fontSize={fontSize}
          headingFontSize={FONT_SIZES.sm}
          emptyText=""
        />
      ) : null}
      <WeaponMasteryBlock mastery={item?.mastery} fontSize={fontSize} />
    </Box>
  );
}

// Quantity stepper + Add button. Holds local qty state and calls onAdd(qty).
// Stops click propagation so it can sit inside a click-to-expand row without
// toggling the row. `addColor` themes the Add button per context.
export function QuantityAdder({ onAdd, max = 999, addColor = 'primary', sx }) {
  const [qty, setQty] = useState(1);
  const clampQty = (value) => clampInt(value, 1, max, 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0, ...sx }} onClick={(event) => event.stopPropagation()}>
      <CountStepper value={qty} size={17} onStep={(delta) => setQty((value) => clampQty(value + delta))} />
      <Button size="small" variant="contained" color={addColor} onClick={() => onAdd(qty)} sx={{ ml: 0.25, minWidth: 0, px: '8px', py: '1px', fontSize: FONT_SIZES.xs, lineHeight: 1.5 }}>Add</Button>
    </Box>
  );
}
