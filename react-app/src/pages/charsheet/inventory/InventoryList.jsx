import { useDeferredValue, useMemo, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { Package } from 'lucide-react';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { getSlotConflictWarnings } from './equipmentSlots.js';
import { getArmorPenalties } from './armorPenalties.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import InventoryRow from './InventoryRow.jsx';
import { itemQty } from '../../../shared/character/inventory/weight.js';
import ItemFilterPanel from '../../../shared/character/inventory/ItemFilterPanel.jsx';
import { hasActiveItemFilters } from '../../../shared/character/inventory/itemFilters.js';
import { usePagedList } from '../../../shared/ui/usePagedList.js';
import { ITEM_GROUP_CHIPS, ITEM_GROUP_KEYS, itemGroupKey as itemType } from '../../../shared/character/inventory/itemGroups.js';
import { byItemName } from '../../../shared/character/inventory/itemSearch.js';
import ItemGroupFilter, { ITEM_GROUP_ICONS } from '../../../shared/character/inventory/ItemGroupFilter.jsx';
import { useItemListQuery } from '../../../shared/character/inventory/useItemListQuery.js';
import { inventorySectionSx } from './inventoryControls.jsx';
import { sheetSectionHeaderSx } from '../../../shared/ui/PanelHeader.jsx';
import ShowMoreButton from '../../../shared/ui/ShowMoreButton.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { isArmorOrShield } from '../../../shared/character/inventory/itemKinds.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';


// The inventory section headers, in shelf order. Derived from the same keys, so
// a new group cannot end up filterable but unrenderable.
const GROUP_LABELS = Object.fromEntries(ITEM_GROUP_CHIPS.map((chip) => [chip.key, chip.label]));
const GROUPS = ITEM_GROUP_KEYS.map((key) => ({ key, label: GROUP_LABELS[key], icon: ITEM_GROUP_ICONS[key] }));
// An inventory row's item (rows keep their index beside it).
const entryItem = (entry) => entry.item;

// The owned inventory is a different scale from the item database — dozens of
// rows, not thousands — so a small page keeps the first paint light and
// "Show more" rarely appears.
const INVENTORY_PAGE = 50;

const inventoryListSx = {
  maxHeight: { xs: 320, md: 'min(46vh, 520px)' },
  overflowY: 'auto',
  overflowX: 'hidden',
  pr: 0.5,
  mr: -0.5,
  scrollbarGutter: 'stable',
};

const inventorySectionHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
  flexWrap: 'wrap',
};

const inventorySectionTitleSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  minWidth: 0,
  ...sheetSectionHeaderSx({ rule: null }),
};

const inventorySectionRuleSx = {
  ...inventorySectionTitleSx,
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

// The owned items: their own search, chips and filter panel, grouped by kind
// and paged. Rows write through the memoized `actions` and `attunement`
// objects the tab hands to every row.
export default function InventoryList({ inv, character: C, itemFlagDefs, attunement, actions }) {
  const [inventorySearch, setInventorySearch] = useState('');
  const deferredInventorySearch = useDeferredValue(inventorySearch);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [inventoryStates, setInventoryStates] = useState([]);

  // Owned items, each beside its inventory index, narrowed as on every item
  // list (useItemListQuery).
  const resolvedInv = useMemo(() => inv.map((item, index) => ({ item, index, type: itemType(item) })), [inv]);
  const { results: visibleInventory, filterList: inventoryList, resetKey: inventoryResetKey } = useItemListQuery(resolvedInv, {
    chip: inventoryFilter, states: inventoryStates, query: deferredInventorySearch, getItem: entryItem,
  });
  // Flattened in display order (group by group, alphabetical inside each) so a
  // page boundary falls where the reader expects, then regrouped for rendering.
  const orderedInventory = useMemo(() => {
    const groups = groupEntriesByType(visibleInventory);
    Object.values(groups).forEach((entries) => entries.sort(byItemName));
    return GROUPS.flatMap((group) => groups[group.key]);
  }, [visibleInventory]);
  const slotWarnings = useMemo(() => getSlotConflictWarnings(inv), [inv]);
  const totalItems = useMemo(() => inv.reduce((sum, item) => sum + itemQty(item), 0), [inv]);
  const visibleTotalItems = useMemo(() => visibleInventory.reduce((sum, entry) => sum + itemQty(entry.item), 0), [visibleInventory]);
  const inventoryFiltered = inventoryFilter !== 'all'
    || inventoryStates.length > 0
    || deferredInventorySearch.trim().length > 0
    || hasActiveItemFilters(inventoryList.filters);

  const inventoryPage = usePagedList(orderedInventory, { pageSize: INVENTORY_PAGE, resetKey: inventoryResetKey });
  const groupedInventory = groupEntriesByType(inventoryPage.visible);
  const profSets = useProficiencySets();

  return (
    <Box sx={{ ...inventorySectionSx, mb: 0 }}>
      <Box sx={{ ...inventorySectionHeaderSx, mb: 0.75 }}>
        <InventorySectionTitle icon={Package} label={`Inventory (${inventoryFiltered ? `${visibleTotalItems} / ` : ''}${totalItems})`} />
      </Box>

      <SearchField
        placeholder="Search inventory by name, source, type, property..."
        value={inventorySearch}
        onChange={setInventorySearch}
        density="compact"
        sx={{ mb: 0.5 }}
      />

      <ItemGroupFilter value={inventoryFilter} onChange={setInventoryFilter} states={inventoryStates} onStatesChange={setInventoryStates} />

      <ItemFilterPanel {...inventoryList.panelProps} sx={{ mb: 0.5 }} />

      <Box {...inventoryPage.listProps} sx={inventoryListSx}>
        {GROUPS.map((group) => {
          const inGroup = groupedInventory[group.key] || [];
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
        })}
        {inventoryPage.remaining > 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ShowMoreButton page={inventoryPage} />
          </Box>
        ) : null}
        {!inv.length && <EmptyLine inList>Inventory empty.</EmptyLine>}
        {inv.length > 0 && !visibleInventory.length && (
          <EmptyLine inList>No inventory items match this search or filter.</EmptyLine>
        )}
      </Box>
    </Box>
  );
}

function InventorySectionTitle({ icon: Icon, label }) {
  return (
    <Typography sx={inventorySectionTitleSx}>
      {Icon ? <Icon size={ICON_SIZES.xs} /> : null}
      {label}
    </Typography>
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
