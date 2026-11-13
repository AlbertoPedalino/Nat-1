import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { ItemPropertyTable } from './ItemPropertyTable.jsx';
import { WeaponMasteryBlock } from '../combat/WeaponMasteryBlock.jsx';
import { clampInt } from '../../numbers.js';
import CountStepper from '../../ui/CountStepper.jsx';
import { FONT_SIZES, LINE_HEIGHTS } from '../../ui/fonts.js';
import { UI_COLORS } from '../../ui/colors.js';
import { CARD_SX } from '../../ui/interactive.js';
import { ExpandableCard } from '../../ui/ExpandableCard.jsx';
import { ItemNameIcon } from '../../content/FiveEToolsLink.jsx';
import ToneBar from '../../ui/ToneBar.jsx';
import { cardToneSx, scrollWellSx } from '../../ui/surfaces.js';
import { rarityTone } from './itemRarity.js';

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
// toggling the row. `addColor` themes the Add button per context.
function QuantityAdder({ onAdd, max = 999, addColor = 'primary', sx }) {
  const [qty, setQty] = useState(1);
  const clampQty = (value) => clampInt(value, 1, max, 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0, ...sx }} onClick={(event) => event.stopPropagation()}>
      <CountStepper value={qty} size={17} onStep={(delta) => setQty((value) => clampQty(value + delta))} />
      <Button size="small" variant="contained" color={addColor} onClick={() => onAdd(qty)} sx={{ ml: 0.25, minWidth: 0, px: 1, py: 0.25, fontSize: FONT_SIZES.xs, lineHeight: LINE_HEIGHTS.normal }}>Add</Button>
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
      <Typography noWrap sx={{ minWidth: 0, fontSize: FONT_SIZES.xxl, color: tone || 'text.primary' }}>{name}</Typography>
    </Box>
  );
}

// An item card's surface: a magic item's washed in its rarity's colour
// (cardToneSx), any other's `fallback`.
export function itemCardSurfaceSx(item, fallback = null) {
  const tone = rarityTone(item);
  return tone ? cardToneSx(tone) : fallback;
}

// The sunken well an item list scrolls in (the items to add, an
// inventory), `maxHeight` tall at most: the same in the builder and on the
// sheet, its cards spaced by their own margin.
export function itemListWellSx(maxHeight) {
  return { ...scrollWellSx(maxHeight), p: 0.5 };
}

export function ItemAddRow({ item, onAdd }) {
  return (
    <ExpandableCard
      containerSx={{ ...CARD_SX, flexShrink: 0, overflow: 'hidden', mb: 0.5 }}
      detailsSx={ITEM_DETAILS_SX}
      details={<ItemReferenceBody item={item} />}
      summary={({ toggle }) => (
        <Box onClick={toggle} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.75, cursor: 'pointer', ...itemCardSurfaceSx(item) }}>
          <ItemCardTitle item={item} />
          <QuantityAdder onAdd={(qty) => onAdd(item, qty)} addColor="success" />
        </Box>
      )}
    />
  );
}

// The opened part of an item card: its reference text on the sunken tint.
export const ITEM_DETAILS_SX = Object.freeze({
  px: 1.25, pt: 0.25, pb: 1, bgcolor: UI_COLORS.surfaceSunken, fontSize: FONT_SIZES.md, color: 'text.secondary',
});
