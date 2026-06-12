import { useState } from 'react';
import { Box, Button, IconButton } from '@mui/material';
import { Minus, Plus } from 'lucide-react';
import { EntryBlocks } from './EntryBlocks.jsx';
import { ItemPropertyTable } from './ItemPropertyTable.jsx';
import { WeaponMasteryBlock } from './WeaponMasteryBlock.jsx';

// Read-only reference body for an item: property grid + rich-text entries
// (live 5etools entries from the items DB). Shared by the builder + sheet
// inventory rows so the expanded view stays identical everywhere.
// A weapon's mastery is always shown here as reference (unlike the Actions tab,
// which only surfaces it when the character actually has that mastery).
export function ItemReferenceBody({ item, fontSize = '0.72rem', sx }) {
  const hasEntries = Array.isArray(item?.entries) && item.entries.length > 0;
  return (
    <Box sx={sx}>
      <ItemPropertyTable item={item} sx={{ mb: hasEntries ? '6px' : 0 }} />
      {hasEntries ? <EntryBlocks entries={item.entries} fontSize={fontSize} emptyText="" /> : null}
      <WeaponMasteryBlock mastery={item?.mastery} fontSize={fontSize} />
    </Box>
  );
}

const qtyBtnSx = {
  width: 17,
  height: 17,
  border: 1,
  borderColor: 'divider',
  borderRadius: '3px',
  color: 'text.secondary',
  '&:hover': { borderColor: '#caa550', color: '#caa550' },
};

// Quantity stepper + Add button. Holds local qty state and calls onAdd(qty).
// Stops click propagation so it can sit inside a click-to-expand row without
// toggling the row. `addColor` themes the Add button per context.
export function QuantityAdder({ onAdd, max = 999, addColor = 'primary', sx }) {
  const [qty, setQty] = useState(1);
  const clamp = (value) => Math.max(1, Math.min(max, Math.round(Number(value)) || 1));
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0, ...sx }} onClick={(event) => event.stopPropagation()}>
      <IconButton size="small" aria-label="Decrease quantity" onClick={() => setQty((value) => clamp(value - 1))} sx={qtyBtnSx}><Minus size={11} /></IconButton>
      <Box sx={{ minWidth: 15, textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, fontSize: '0.7rem', color: '#edd48a' }}>{qty}</Box>
      <IconButton size="small" aria-label="Increase quantity" onClick={() => setQty((value) => clamp(value + 1))} sx={qtyBtnSx}><Plus size={11} /></IconButton>
      <Button size="small" variant="contained" color={addColor} onClick={() => onAdd(qty)} sx={{ ml: 0.25, minWidth: 0, px: '8px', py: '1px', fontSize: '0.62rem', lineHeight: 1.5 }}>Add</Button>
    </Box>
  );
}
