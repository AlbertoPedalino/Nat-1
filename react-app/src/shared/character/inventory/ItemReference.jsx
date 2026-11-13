import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { ItemPropertyTable } from './ItemPropertyTable.jsx';
import { WeaponMasteryBlock } from '../combat/WeaponMasteryBlock.jsx';
import { clampInt } from '../../numbers.js';
import CountStepper from '../../ui/CountStepper.jsx';
import { FONT_SIZES } from '../../ui/fonts.js';
import PickableRow from '../../ui/PickableRow.jsx';
import { PICK_ACTION_SX } from '../../ui/entryCard.js';
import { ItemNameIcon } from '../../content/FiveEToolsLink.jsx';
import ToneBar from '../../ui/ToneBar.jsx';
import { cardToneSx } from '../../ui/surfaces.js';
import { rarityTone } from './itemRarity.js';
import { cardTitleSx } from '../../ui/PanelHeader.jsx';
import ScrollingName from '../../ui/ScrollingName.jsx';

// Read-only reference body for an item: property grid + rich-text entries
// (live 5etools entries from the items DB). Shared by the builder + sheet
// inventory rows so the expanded view stays identical everywhere.
// A weapon's mastery is always shown here as reference (unlike the Actions tab,
// which only surfaces it when the character actually has that mastery).
// `exclude` drops property rows a screen already shows elsewhere (the
// compendium's header line).
export function ItemReferenceBody({ item, fontSize = FONT_SIZES.md, exclude, sx }) {
  const hasEntries = Array.isArray(item?.entries) && item.entries.length > 0;
  return (
    <Box sx={sx}>
      <ItemPropertyTable item={item} exclude={exclude} sx={{ mb: hasEntries ? 0.75 : 0 }} />
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
// toggling the row.
function QuantityAdder({ onAdd, max = 999, sx }) {
  const [qty, setQty] = useState(1);
  const clampQty = (value) => clampInt(value, 1, max, 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0, ...sx }} onClick={(event) => event.stopPropagation()}>
      <CountStepper value={qty} size={17} onStep={(delta) => setQty((value) => clampQty(value + delta))} />
      <Button size="small" variant="contained" color="primary" onClick={() => onAdd(qty)} sx={{ ...PICK_ACTION_SX, ml: 0.25 }}>Add</Button>
    </Box>
  );
}

// An item to add from a database (the sheet's add panel, the builder's
// equipment list): its name and icon, a quantity and Add on the right, its
// reference text when opened. The quantity adder stops propagation, so it
// never toggles the card.
// The head of every item card (the inventory, the list to add from): a magic
// item's rarity as its bar and its name's colour, then its 5etools link icon
// and its name (`name`, when the card names it otherwise: a scroll's spell).
// One head, so an item reads the same wherever it is listed.
export function ItemCardTitle({ item, name = item?.name }) {
  const tone = rarityTone(item);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
      <ToneBar tone={tone} />
      <ItemNameIcon item={item} />
      <ScrollingName sx={{ ...cardTitleSx, color: tone || 'text.primary' }}>{name}</ScrollingName>
    </Box>
  );
}

// An item card's surface: a magic item's washed in its rarity's colour
// (cardToneSx), any other's `fallback`.
export function itemCardSurfaceSx(item, fallback = null) {
  const tone = rarityTone(item);
  return tone ? cardToneSx(tone) : fallback;
}

// An item offered to add (shared/ui/entryCard.js), on the sheet's add panel
// and the builder's equipment list: a pickable row, its quantity and Add at
// the right, its reference opened below. Lay the list in scrollWellSx.
export function ItemAddRow({ item, onAdd }) {
  return (
    <PickableRow details={<ItemReferenceBody item={item} />}>
      <ItemCardTitle item={item} />
      <QuantityAdder onAdd={(qty) => onAdd(item, qty)} />
    </PickableRow>
  );
}
