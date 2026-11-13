import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { Package } from 'lucide-react';
import { getSlotConflictWarnings } from './equipmentSlots.js';
import { getArmorPenalties } from './armorPenalties.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import InventoryRow from './InventoryRow.jsx';
import { itemQty } from '../../../shared/character/inventory/weight.js';
import { ITEM_GROUP_CHIPS, ITEM_GROUP_KEYS, itemGroupKey as itemType } from '../../../shared/character/inventory/itemGroups.js';
import { byItemName } from '../../../shared/character/inventory/itemSearch.js';
import { ITEM_GROUP_ICONS } from '../../../shared/character/inventory/ItemGroupFilter.jsx';
import ItemBrowser, { ItemListSection } from '../../../shared/character/inventory/ItemBrowser.jsx';
import { sheetSectionHeaderSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { isArmorOrShield } from '../../../shared/character/inventory/itemKinds.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';

// The inventory section headers, in shelf order. Derived from the same keys, so
// a new group cannot end up filterable but unrenderable.
const GROUP_LABELS = Object.fromEntries(ITEM_GROUP_CHIPS.map((chip) => [chip.key, chip.label]));
const GROUPS = ITEM_GROUP_KEYS.map((key) => ({ key, label: GROUP_LABELS[key], icon: ITEM_GROUP_ICONS[key] }));
const GROUP_RANK = Object.fromEntries(GROUPS.map((group, rank) => [group.key, rank]));
// An inventory row's item (rows keep their index beside it).
const entryItem = (entry) => entry.item;
// Shelf by shelf, alphabetical on each, so a page boundary falls where the
// reader expects; the page is then regrouped under its shelves' headers.
const byShelfThenName = (a, b) => (GROUP_RANK[a.type] ?? 99) - (GROUP_RANK[b.type] ?? 99) || byItemName(a, b);

// The owned inventory is a different scale from the item database — dozens of
// rows, not thousands — so a small page keeps the first paint light and the
// next one rarely needs to load.
const INVENTORY_PAGE = 50;

const inventorySectionRuleSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  minWidth: 0,
  ...sheetSectionHeaderSx(),
  pb: 0.5,
  mt: 0.5,
  mb: 0.5,
};

function groupEntriesByType(entries) {
  const groups = Object.fromEntries(GROUPS.map((group) => [group.key, []]));
  entries.forEach((entry) => {
    if (groups[entry.type]) groups[entry.type].push(entry);
  });
  return groups;
}

// The owned items (ItemBrowser, as every item list: their own search, shelves,
// states and filters), grouped by shelf and paged. Rows write through the
// memoized `actions` and `attunement` objects the tab hands to every row.
export default function InventoryList({ inv, character: C, itemFlagDefs, attunement, actions }) {
  const search = useState('');
  const chips = useState([]);
  const states = useState([]);
  const entries = useMemo(() => inv.map((item, index) => ({ item, index, type: itemType(item) })), [inv]);
  const slotWarnings = useMemo(() => getSlotConflictWarnings(inv), [inv]);
  const totalItems = useMemo(() => inv.reduce((sum, item) => sum + itemQty(item), 0), [inv]);
  const profSets = useProficiencySets();

  const renderRows = useCallback((visible) => {
    const grouped = groupEntriesByType(visible);
    return GROUPS.map((group) => {
      const inGroup = grouped[group.key] || [];
      if (!inGroup.length) return null;
      return (
        <Box key={group.key}>
          <SectionHeader icon={group.icon} label={group.label} />
          {group.key === 'weapon' && slotWarnings.length > 0 ? slotWarnings.map((w, i) => (
            <Alert key={i} severity="warning" sx={{ fontSize: FONT_SIZES.sm, py: 0.25, px: 1, mb: 0.5 }}>
              {w}
            </Alert>
          )) : null}
          {inGroup.map(({ item, index }) => (
            <InventoryRow
              key={`${item.name}-${item.source}-${index}`}
              item={item}
              index={index}
              character={C}
              penaltyMsg={getPenaltyMessage(C, item, profSets)}
              itemFlagDefs={itemFlagDefs}
              attunement={attunement}
              actions={actions}
            />
          ))}
        </Box>
      );
    });
  }, [C, actions, attunement, itemFlagDefs, profSets, slotWarnings]);

  return (
    <ItemListSection icon={Package} title={`Inventory (${formatNumber(totalItems)})`}>
      <ItemBrowser
        entries={entries}
        getItem={entryItem}
        search={search}
        placeholder="Search inventory…"
        chips={chips}
        states={states}
        order={byShelfThenName}
        pageSize={INVENTORY_PAGE}
        renderRows={renderRows}
        empty={<EmptyLine inList>Inventory empty.</EmptyLine>}
        noMatch="No inventory items match this search or filter."
      />
    </ItemListSection>
  );
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <Typography sx={inventorySectionRuleSx}>
      {Icon ? <Icon size={ICON_SIZES.xs} /> : null}
      {label}
    </Typography>
  );
}

const getPenaltyMessage = (() => {
  let lastC = null;
  let cache = new WeakMap();

  return function getPenaltyMessage(C, item, precomputedSets) {
    if (lastC !== C) {
      lastC = C;
      cache = new WeakMap();
    }
    if (!item || !item.equipped || !isArmorOrShield(item) || !C) return '';
    if (cache.has(item)) return cache.get(item);

    const armorPenalty = getArmorPenalties(C, item, precomputedSets);
    const msg = armorPenalty?.hasPenalty ? (() => {
      const parts = [];
      if (armorPenalty.penalties) {
        armorPenalty.penalties.forEach((p) => {
          if (p.type === 'disadvantage') {
            const labels = p.applies.map((x) => x === 'dex-stealth' ? 'Stealth' : x.split('-')[0].toUpperCase());
            parts.push(`Disadvantage on ${labels.join('/')}`);
          } else if (p.type === 'speed-penalty') {
            parts.push(`Speed -${Math.abs(p.amount)} ft`);
          } else if (p.type === 'no-shield-ac') {
            parts.push('No shield AC');
          } else if (p.type === 'no-spellcasting') {
            parts.push("Can't cast spells");
          }
        });
      }
      return parts.join(' • ');
    })() : '';

    cache.set(item, msg);
    return msg;
  };
})();
