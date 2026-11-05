import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import { Backpack, Check, ChevronDown, ChevronRight, Package, Plus, Shield, Sparkles, Swords } from 'lucide-react';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { loadItems } from '../../charbuilder/data/dataLoaders.js';
import { getFinal } from '../state/calculations.js';
import { installedRegistry } from '../../../adapters/index.js';
import { availableItemFlagDefs, toggleItemFlag } from '../../../shared/character/inventory/itemFlags.js';
import {
  THROWN_SLOT,
  equipToSlot as equipToSlotHelper,
  getSlotConflictWarnings,
} from './equipmentSlots.js';

import { ItemNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import { INVENTORY_SOURCE_PRIORITY, sourceRank } from '../../../shared/content/sourcePriority.js';
import { addInventoryEntries, setOneInventoryUnitCarried } from '../../../shared/character/inventory/itemContainers.js';
import {
  countAttunedItems,
  toggleItemAttunement,
} from '../../../shared/character/inventory/itemAttunement.js';
import { extractTomeBonus } from '../../../shared/character/inventory/itemEffects.js';
import { getArmorPenalties } from './armorPenalties.js';
import { getCharacterAttunementState } from './attunement.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { CurrencyRow } from '../../../shared/character/inventory/CurrencyCoinBox.jsx';
import { setCoinAmount, updateCustomCurrency } from '../../../shared/character/inventory/currency.js';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { ItemReferenceBody, QuantityAdder } from '../../../shared/character/inventory/ItemReference.jsx';
import { itemDisplayName } from '../../../shared/character/inventory/itemIdentity.js';
import { writeOnScroll } from '../../../shared/character/inventory/spellScrolls.js';
import InventoryRow from './InventoryRow.jsx';
import {
  carryCapacity,
  formatWeight,
  isItemCarried,
  itemQty as qty,
  totalCarriedWeight,
} from '../../../shared/character/inventory/weight.js';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import {
  itemChargeCurrent,
  itemChargeMaximum,
  setInventoryItemCharges,
} from '../../../shared/character/inventory/itemCharges.js';
import ItemFilterPanel from '../../../shared/character/inventory/ItemFilterPanel.jsx';
import { hasActiveItemFilters, itemMatchesFilters } from '../../../shared/character/inventory/itemFilters.js';
import { useItemFilters } from '../../../shared/character/inventory/useItemFilters.js';
import { usePagedList } from '../../../shared/ui/usePagedList.js';
import {
  ITEM_GROUP_CHIPS,
  ITEM_GROUP_KEYS,
  OWNED_ITEM_CHIPS,
  itemGroupKey as itemType,
  matchesItemGroupChip,
} from '../../../shared/character/inventory/itemGroups.js';

// Keys and labels come from the shared chip taxonomy; the sheet only adds the
// icons, which are its own presentation. The add-item search gets the plain set
// (no "Equipped" — database items are not owned), the inventory the owned set.
const CHIP_ICONS = { weapon: Swords, armor: Shield, gear: Backpack, magic: Sparkles, equipped: Check };
const withIcons = (chips) => chips.map((chip) => ({ ...chip, icon: CHIP_ICONS[chip.key] || null }));

const FILTERS = withIcons(ITEM_GROUP_CHIPS);
const INVENTORY_FILTERS = withIcons(OWNED_ITEM_CHIPS);

// The inventory section headers, in shelf order. Derived from the same keys, so
// a new group cannot end up filterable but unrenderable.
const GROUP_LABELS = Object.fromEntries(ITEM_GROUP_CHIPS.map((chip) => [chip.key, chip.label]));
const GROUPS = ITEM_GROUP_KEYS.map((key) => ({ key, label: GROUP_LABELS[key], icon: CHIP_ICONS[key] }));


const compactInputSx = {
  '& .MuiOutlinedInput-root': { bgcolor: 'rgba(35,32,26,1)', borderRadius: 1 },
  '& input': { fontSize: '0.75rem', py: '7px' },
};

const inventoryListSx = {
  maxHeight: { xs: 320, md: 'min(46vh, 520px)' },
  overflowY: 'auto',
  overflowX: 'hidden',
  pr: 0.5,
  mr: -0.5,
  scrollbarGutter: 'stable',
};

const filterButtonSx = (active) => ({
  minHeight: 0,
  px: '10px',
  py: '3px',
  border: 1,
  borderColor: active ? '#caa550' : 'divider',
  borderRadius: 1,
  bgcolor: active ? 'rgba(202,165,80,0.12)' : 'transparent',
  color: active ? '#edd48a' : 'text.secondary',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.56rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

const inventorySectionSx = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(18,16,14,0.48)',
  p: '8px',
  mb: 1,
};

const inventorySectionHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  flexWrap: 'wrap',
};

const inventorySectionTitleSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  minWidth: 0,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const addPanelToggleSx = (open) => ({
  minHeight: 0,
  px: '12px',
  py: '4px',
  border: 1,
  borderColor: open ? '#caa550' : 'divider',
  borderRadius: 1,
  bgcolor: open ? 'rgba(202,165,80,0.14)' : 'rgba(35,32,26,1)',
  color: open ? '#edd48a' : 'text.secondary',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  '&:hover': {
    borderColor: '#caa550',
    color: '#edd48a',
    bgcolor: open ? 'rgba(202,165,80,0.18)' : 'rgba(202,165,80,0.08)',
  },
});


function normalizeStoredItem(item) {
  const {
    _itemType,
    _searchName,
    _searchText,
    _sourcePriority,
    _rarityPriority,
    quantity: _sourceQuantity,
    weightLb: _sourceWeightLb,
    carried: _sourceCarried,
    equipped: _sourceEquipped,
    equippedSlot: _sourceEquippedSlot,
    attuned: _sourceAttuned,
    ...baseItem
  } = item || {};
  const carried = _sourceCarried !== false;
  return {
    ...baseItem,
    name: baseItem.name,
    source: baseItem.source || 'Custom',
    type: baseItem.type || 'gear',
    rarity: baseItem.rarity || 'none',
    weight: Number(baseItem.weight ?? 0),
    value: Number(baseItem.value || 0),
    qty: Math.max(1, Number(baseItem.qty ?? 1) || 1),
    equipped: carried && !!_sourceEquipped,
    custom: !!baseItem.custom,
    ...(carried && _sourceEquippedSlot ? { equippedSlot: _sourceEquippedSlot } : {}),
    ...(carried && _sourceAttuned ? { attuned: true } : {}),
    ...(!carried ? { carried: false } : {}),
  };
}

function parseDecimalInput(value) {
  const parsed = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function itemSearchText(item) {
  return normalizeSearch([
    itemDisplayName(item),
    item?.name,
    item?.source,
    item?.sourceAlias,
    item?.type,
    item?.rarity,
    item?.scfType,
    item?.weaponCategory,
    item?.dmgType,
    Array.isArray(item?.property) ? item.property.join(' ') : '',
    Array.isArray(item?.properties) ? item.properties.join(' ') : '',
    Array.isArray(item?.mastery) ? item.mastery.join(' ') : '',
    Array.isArray(item?.focus) ? item.focus.join(' ') : '',
    Array.isArray(item?.group) ? item.group.join(' ') : '',
    Array.isArray(item?.items) ? item.items.map((ref) => String(ref || '').split('|')[0]).join(' ') : '',
  ].filter(Boolean).join(' '));
}

function itemMatchesSearch(item, query) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const haystack = itemSearchText(item);
  return q.split(' ').every((part) => haystack.includes(part));
}

function sourcePriority(source) {
  return sourceRank(source, INVENTORY_SOURCE_PRIORITY);
}

function rarityPriority(rarity) {
  const order = ['none', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
  const idx = order.indexOf(String(rarity || 'none').toLowerCase());
  return idx === -1 ? 999 : idx;
}

function compareItemsBySearch(query) {
  const q = normalizeSearch(query);
  return (a, b) => {
    if (q) {
      const an = a._searchName || normalizeSearch(a?.name);
      const bn = b._searchName || normalizeSearch(b?.name);
      const score = (name) => {
        if (name === q) return 0;
        if (name.startsWith(`${q} `) || name.startsWith(`${q},`) || name.startsWith(`${q}+`)) return 1;
        if (name.startsWith(q)) return 2;
        if (name.split(' ').some((part) => part.startsWith(q))) return 3;
        if (name.includes(q)) return 4;
        return 5;
      };
      const as = score(an);
      const bs = score(bn);
      if (as !== bs) return as - bs;
    }

    const ap = a._sourcePriority ?? sourcePriority(a?.source);
    const bp = b._sourcePriority ?? sourcePriority(b?.source);
    if (ap !== bp) return ap - bp;

    const ar = a._rarityPriority ?? rarityPriority(a?.rarity);
    const br = b._rarityPriority ?? rarityPriority(b?.rarity);
    if (ar !== br) return ar - br;

    return String(a?.name || '').localeCompare(String(b?.name || ''));
  };
}

function prepareSearchItem(item) {
  return {
    ...item,
    _itemType: itemType(item),
    _searchName: normalizeSearch(itemDisplayName(item)),
    _searchText: itemSearchText(item),
    _sourcePriority: sourcePriority(item?.source),
    _rarityPriority: rarityPriority(item?.rarity),
  };
}

function itemMatchesPreparedSearch(item, query) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const haystack = item._searchText || itemSearchText(item);
  return q.split(' ').every((part) => haystack.includes(part));
}

// The result list renders in pages instead of hard-capping: a broad filter can
// legitimately match most of the item DB (~2500 entries once magic variants are
// expanded, so most searches overflow any fixed cap), and truncating
// made it look like the filter had only searched the first alphabetical slice.
// 120 rows a page: the old hard cap rendered that many at once, so the DOM cost
// is known to be fine, and it takes fewer scrolls to cross a ~2500-item DB.
const SEARCH_PAGE = 120;
// The owned inventory is a different scale — dozens of rows, not thousands — so
// a smaller page keeps the first paint light and "Show more" rarely appears.
const INVENTORY_PAGE = 50;

// Entries keep their original inventory index, so qty/equip/remove keep
// targeting the right item no matter how the list is grouped or sliced.
function byItemName(a, b) {
  return String(a.item?.name || '').localeCompare(String(b.item?.name || ''), undefined, { sensitivity: 'base' });
}

function groupEntriesByType(entries) {
  const groups = Object.fromEntries(GROUPS.map((group) => [group.key, []]));
  entries.forEach((entry) => {
    if (groups[entry.type]) groups[entry.type].push(entry);
  });
  return groups;
}

let itemsCachePromise = null;

function loadItemsCached() {
  if (!itemsCachePromise) {
    itemsCachePromise = loadItems().then((items) => (items || []).map(prepareSearchItem));
  }
  return itemsCachePromise;
}

// Add-list row: tap to expand the item reference (props + live rich text),
// pick a quantity, then Add. The quantity adder stops propagation so it never
// toggles the expand.
function AddResultRow({ item, onAdd }) {
  return (
    <ExpandableCard
      containerSx={{ flexShrink: 0, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'rgba(35,32,26,1)', overflow: 'hidden', '&:hover': { borderColor: '#caa550' } }}
      detailsSx={{ px: '10px', pt: '2px', pb: '8px', bgcolor: '#12100e', fontSize: '0.7rem', color: 'text.secondary' }}
      details={<ItemReferenceBody item={item} />}
      summary={({ toggle }) => (
        <Box onClick={toggle} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '10px', py: '5px', cursor: 'pointer' }}>
          <ItemNameIcon item={item} />
          <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem', color: 'text.primary' }}>{item.name}</Typography>
          <QuantityAdder onAdd={(qty) => onAdd(item, qty)} addColor="success" />
        </Box>
      )}
    />
  );
}

function ShowMoreButton({ remaining, onClick }) {
  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{ alignSelf: 'center', my: 0.5, px: '12px', py: '2px', border: 1, borderColor: 'divider', borderRadius: 1, color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', '&:hover': { borderColor: '#caa550', color: '#caa550' } }}
    >
      Show more ({remaining})
    </Button>
  );
}

const SearchResultsList = memo(function SearchResultsList({ items, itemsDbCount, onAddItem, resetKey }) {
  const { visible, remaining, showMore, listProps } = usePagedList(items, { pageSize: SEARCH_PAGE, resetKey });

  return (
    <Box {...listProps} sx={{ maxHeight: 320, overflowY: 'auto', mb: 0.75, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'rgba(18,16,14,0.65)', p: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {visible.map((item) => (
        <AddResultRow key={`${item.name}-${item.source}`} item={item} onAdd={onAddItem} />
      ))}
      {remaining > 0 ? <ShowMoreButton remaining={remaining} onClick={showMore} /> : null}
      {!items.length && (
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic', py: 0.75, px: 1 }}>
          {itemsDbCount ? 'No items found.' : 'Loading items.'}
        </Typography>
      )}
    </Box>
  );
});

function InventoryFilterButtons({ value, onChange, filters = FILTERS }) {
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

export default function InventoryTab({ C, sheet }) {
  const { onUpdateInventory, onUpdateCurrency, onUpdateCharacter, onShowToast } = useSheetActions();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filter, setFilter] = useState('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const deferredInventorySearch = useDeferredValue(inventorySearch);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [itemsDb, setItemsDb] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customWeight, setCustomWeight] = useState('');
  const [customValue, setCustomValue] = useState('');
  const inv = sheet?.sheetInventory || [];
  const currency = sheet?.sheetCurrency || {};
  const invRef = useRef(inv);

  useEffect(() => {
    invRef.current = inv;
  }, [inv]);

  useEffect(() => {
    let alive = true;
    loadItemsCached().then((items) => {
      if (alive) setItemsDb(items);
    }).catch(() => {
      if (alive) setItemsDb([]);
    });
    return () => { alive = false; };
  }, []);

  // The pool each filter panel builds its dropdowns from: narrowed by the chip
  // and the search box, but *not* by the panel's own choices. Otherwise the
  // chips and the Type dropdown contradict each other — chip "Armor" would keep
  // offering "Martial Melee Weapon", which can only ever return nothing.
  // Excluding the panel's own choices keeps a picked value from collapsing its
  // own dropdown to that single entry.
  const resolvedInv = useMemo(() => inv.map((item, index) => ({ item, index, type: itemType(item) })), [inv]);
  const inventoryPool = useMemo(() => {
    const q = deferredInventorySearch.trim();
    return resolvedInv.filter((entry) => (
      matchesItemGroupChip(entry.item, inventoryFilter) && itemMatchesSearch(entry.item, q)
    ));
  }, [deferredInventorySearch, inventoryFilter, resolvedInv]);
  const inventoryPoolItems = useMemo(() => inventoryPool.map((entry) => entry.item), [inventoryPool]);

  // Two independent filter sets: narrowing the item DB search must not silently
  // hide rows in the inventory list below it.
  const searchPool = useMemo(() => {
    const q = deferredSearch.trim();
    let items = itemsDb;
    if (filter !== 'all') items = items.filter((item) => item._itemType === filter);
    if (q) items = items.filter((item) => itemMatchesPreparedSearch(item, q));
    return items;
  }, [itemsDb, deferredSearch, filter]);

  const addList = useItemFilters(searchPool);
  const inventoryList = useItemFilters(inventoryPoolItems);

  const visibleInventory = useMemo(
    () => inventoryPool.filter((entry) => itemMatchesFilters(entry.item, inventoryList.filters)),
    [inventoryPool, inventoryList.filters],
  );
  // Flattened in display order (group by group, alphabetical inside each) so a
  // page boundary falls where the reader expects, then regrouped for rendering.
  const orderedInventory = useMemo(() => {
    const groups = groupEntriesByType(visibleInventory);
    Object.values(groups).forEach((entries) => entries.sort(byItemName));
    return GROUPS.flatMap((group) => groups[group.key]);
  }, [visibleInventory]);
  const slotWarnings = useMemo(() => getSlotConflictWarnings(inv), [inv]);
  const inventoryStats = useMemo(() => {
    const totalItems = inv.reduce((sum, item) => sum + qty(item), 0);
    const totalWeight = totalCarriedWeight(inv, currency);
    const totalGp = inv.reduce((sum, item) => sum + (Number(item.value || 0) / 100) * qty(item), 0);
    return { totalItems, totalWeight, totalGp };
  }, [inv, currency]);
  const { totalItems, totalWeight, totalGp } = inventoryStats;
  const visibleTotalItems = useMemo(() => visibleInventory.reduce((sum, entry) => sum + qty(entry.item), 0), [visibleInventory]);
  const inventoryFiltered = inventoryFilter !== 'all'
    || deferredInventorySearch.trim().length > 0
    || hasActiveItemFilters(inventoryList.filters);

  // Paging resets on a changed *query*, not on a changed array: the inventory
  // is rebuilt on every quantity tick, and resetting there would scroll the
  // list back to the top under the user's cursor.
  const searchResetKey = `${deferredSearch.trim()}|${filter}|${addList.key}`;
  const inventoryResetKey = `${deferredInventorySearch.trim()}|${inventoryFilter}|${inventoryList.key}`;
  const inventoryPage = usePagedList(orderedInventory, { pageSize: INVENTORY_PAGE, resetKey: inventoryResetKey });
  const groupedInventory = groupEntriesByType(inventoryPage.visible);
  const maxCarry = useMemo(() => carryCapacity(getFinal(C, 'str')), [C]);
  const carryPct = Math.min(100, (totalWeight / maxCarry) * 100);
  const overloaded = totalWeight > maxCarry;
  const profSets = useProficiencySets();
  const attunementState = useMemo(() => getCharacterAttunementState(C), [C]);
  const attunementFull = useMemo(
    () => countAttunedItems(inv) >= attunementState.limit,
    [attunementState.limit, inv],
  );

  const searchResults = useMemo(() => {
    const q = deferredSearch.trim();
    const items = hasActiveItemFilters(addList.filters)
      ? searchPool.filter((item) => itemMatchesFilters(item, addList.filters))
      : searchPool;
    return q ? [...items].sort(compareItemsBySearch(q)) : items;
  }, [searchPool, deferredSearch, addList.filters]);

  const updateInv = useCallback((next) => onUpdateInventory?.(next), [onUpdateInventory]);

  const addItem = useCallback((item, count = 1) => {
    if (!item?.name) return;
    const current = invRef.current || [];
    const qtyToAdd = Math.max(1, Number(count) || 1);
    updateInv(addInventoryEntries(current, [{ ...item, qty: qtyToAdd }], itemsDb, normalizeStoredItem));
  }, [itemsDb, updateInv]);

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    addItem({
      name,
      source: 'Custom',
      type: 'gear',
      custom: true,
      weight: Math.max(0, parseDecimalInput(customWeight)),
      value: Number(customValue || 0) * 100,
    });
    setCustomName('');
    setCustomWeight('');
    setCustomValue('');
  };

  const adjustQty = useCallback((index, delta) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!target) return;
    // A stack readied to throw stays one stack; anything else equipped is a single unit.
    const singleUnit = (target.equipped || target.equippedSlot) && target.equippedSlot !== THROWN_SLOT;
    if (delta > 0 && (singleUnit || itemChargeMaximum(target) > 0)) {
      const unequippedCopy = { ...target, qty: delta, equipped: false };
      delete unequippedCopy.equippedSlot;
      if (itemChargeMaximum(target) > 0) {
        delete unequippedCopy.attuned;
        delete unequippedCopy.chargesCurrent;
      }
      updateInv(addInventoryEntries(current, [unequippedCopy]));
      return;
    }
    const next = current.flatMap((item, idx) => {
      if (idx !== index) return [item];
      const nextQty = Math.max(0, qty(item) + delta);
      return nextQty > 0 ? [{ ...item, qty: nextQty }] : [];
    });
    updateInv(next);
  }, [updateInv]);

  const removeItem = useCallback((index) => {
    const current = invRef.current || [];
    updateInv(current.filter((_, idx) => idx !== index));
  }, [updateInv]);

  const toggleEquipped = useCallback((index) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!target || !isItemCarried(target)) return;
    const targetType = String(target.type || '').toUpperCase();
    const next = current.map((item, idx) => {
      if (idx === index) return { ...item, equipped: !item.equipped };
      const type = String(item.type || '').toUpperCase();
      if (['LA', 'MA', 'HA'].includes(targetType) && ['LA', 'MA', 'HA'].includes(type) && item.equipped) return { ...item, equipped: false };
      if (targetType === 'S' && type === 'S' && item.equipped) return { ...item, equipped: false };
      return item;
    });
    updateInv(next);
  }, [updateInv]);

  const equipToSlot = useCallback((index, slot) => {
    const current = invRef.current || [];
    if (!isItemCarried(current[index])) return;
    const next = equipToSlotHelper(current, index, slot);
    updateInv(next);
  }, [updateInv]);

  const adjustCharges = useCallback((index, delta) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!target) return;
    updateInv(setInventoryItemCharges(current, index, itemChargeCurrent(target) + delta));
  }, [updateInv]);

  const toggleCarried = useCallback((index) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!target) return;
    updateInv(setOneInventoryUnitCarried(current, index, !isItemCarried(target)));
  }, [updateInv]);

  // Flags a class feature lets the player put on an item (Pact Weapon, Arcane
  // Armor…), declared by the adapters with registerItemFlagDef.
  const itemFlagDefs = useMemo(() => availableItemFlagDefs(installedRegistry.getAllItemFlagDefs(), C), [C]);

  const toggleFlag = useCallback((index, def) => {
    const current = invRef.current || [];
    const next = toggleItemFlag(current, index, def);
    if (next !== current) updateInv(next);
  }, [updateInv]);

  const toggleAttuned = useCallback((index, { curseBroken = false } = {}) => {
    const current = invRef.current || [];
    const result = toggleItemAttunement(current, index, {
      ...attunementState,
      character: C,
      curseBroken,
    });
    if (result.status === 'limit') {
      onShowToast?.('Attunement limit', `You can attune to at most ${attunementState.limit} items. End attunement on another item first.`, 0, []);
      return;
    }
    if (result.status === 'duplicate') {
      onShowToast?.('Attunement duplicate', 'You cannot attune to more than one copy of the same magic item.', 0, []);
      return;
    }
    if (result.status === 'requirement') {
      onShowToast?.('Attunement requirement', result.eligibility?.reason || 'This character does not meet the attunement requirement.', 0, []);
      return;
    }
    if (result.status === 'cursed') {
      onShowToast?.('Cursed item', 'Attunement cannot be ended voluntarily. Break the curse first.', 0, []);
      return;
    }
    if (result.status === 'not-carried') {
      onShowToast?.('Attunement unavailable', 'Carry the item before attuning to it.', 0, []);
      return;
    }
    if (result.status === 'updated') updateInv(result.inventory);
  }, [C, attunementState, updateInv, onShowToast]);

  const setAbilityChoice = useCallback((index, groupIdx, abilities) => {
    const current = invRef.current || [];
    const next = current.map((item, idx) => {
      if (idx !== index) return item;
      const prev = item.abilityChoice && typeof item.abilityChoice === 'object' ? { ...item.abilityChoice } : {};
      prev[groupIdx] = abilities;
      return { ...item, abilityChoice: prev };
    });
    updateInv(next);
  }, [updateInv]);

  // What is written on a Spell Scroll (its spell, DC, attack): see
  // writeOnScroll for how a stack splits and joins.
  const writeScroll = useCallback((index, patch) => {
    updateInv(writeOnScroll(invRef.current || [], index, patch));
  }, [updateInv]);

  const consumeTome = useCallback((index) => {
    const current = invRef.current || [];
    const target = current[index];
    const bonus = extractTomeBonus(target);
    if (!bonus || !onUpdateCharacter) return;
    onUpdateCharacter((prev) => {
      const existing = Array.isArray(prev?.consumedItemBonuses) ? prev.consumedItemBonuses : [];
      return { ...prev, consumedItemBonuses: [...existing, bonus] };
    });
    const nextInv = current.flatMap((item, idx) => {
      if (idx !== index) return [item];
      const nextQty = Math.max(0, qty(item) - 1);
      return nextQty > 0 ? [{ ...item, qty: nextQty }] : [];
    });
    updateInv(nextInv);
    onShowToast?.(`Read ${target.name}`, `Permanent +${bonus.value} to ${bonus.ability.toUpperCase()}`, 0, []);
  }, [updateInv, onUpdateCharacter, onShowToast]);

  const updateCoin = useCallback((coin, value) => {
    onUpdateCurrency?.(setCoinAmount(currency, coin, value));
  }, [currency, onUpdateCurrency]);

  // Custom currencies are created in the builder; the sheet only adjusts amounts.
  const updateCustomAmount = useCallback((id, value) => {
    onUpdateCurrency?.(updateCustomCurrency(currency, id, { amount: value }));
  }, [currency, onUpdateCurrency]);


  // Stable for the memoized rows: every row receives the same two objects.
  const rowActions = useMemo(() => ({
    qty: adjustQty,
    charges: adjustCharges,
    remove: removeItem,
    equip: toggleEquipped,
    equipSlot: equipToSlot,
    carried: toggleCarried,
    toggleFlag,
    attune: toggleAttuned,
    abilityChoice: setAbilityChoice,
    writeScroll,
    consumeTome,
  }), [adjustQty, adjustCharges, removeItem, toggleEquipped, equipToSlot, toggleCarried, toggleFlag, toggleAttuned, setAbilityChoice, writeScroll, consumeTome]);
  const rowAttunement = useMemo(() => ({
    full: attunementFull,
    context: attunementState.context,
    limit: attunementState.limit,
  }), [attunementFull, attunementState]);
  return (
    <Box>
      <CurrencyRow
        mode="sheet"
        currency={currency}
        onCoinChange={updateCoin}
        onCustomAmountChange={updateCustomAmount}
        sx={{ mb: 0.75 }}
      />

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
        <Box sx={statPillSx}>Weight: <b>{formatWeight(totalWeight)} / {formatWeight(maxCarry)} lb</b></Box>
        <Box sx={statPillSx}>Value: <b>{totalGp.toFixed(1)} GP</b></Box>
        {(() => {
          const attunedCount = countAttunedItems(inv);
          const over = attunedCount > attunementState.limit;
          return (
            <Box sx={{ ...statPillSx, bgcolor: over ? 'rgba(222,103,95,0.12)' : 'rgba(35,32,26,1)', borderColor: over ? '#de675f' : 'divider', '& b': { color: over ? '#de675f' : '#edd48a', fontFamily: '"Cinzel", Georgia, serif' } }}>
              Attuned: <b>{attunedCount} / {attunementState.limit}</b>{over ? ' (over limit)' : ''}
            </Box>
          );
        })()}
        <Box sx={{ width: '100%', mt: 0.3 }}>
          <Box sx={{ height: 6, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden', border: 1, borderColor: 'divider' }}>
            <Box sx={{ width: `${carryPct}%`, height: '100%', bgcolor: overloaded ? '#de675f' : '#58b879' }} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', mt: 0.25 }}>
            <Box sx={{ color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif' }}>{formatWeight(totalWeight)} / {formatWeight(maxCarry)} lb</Box>
            <Box sx={{ px: 0.75, py: '1px', borderRadius: 1, bgcolor: overloaded ? 'rgba(222,103,95,0.14)' : 'rgba(63,166,108,0.14)', color: overloaded ? '#de675f' : '#58b879', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.6rem' }}>
              {overloaded ? 'Over Capacity' : 'OK'}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={inventorySectionSx}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: addPanelOpen ? 0.75 : 0 }}>
          <Button
            size="small"
            aria-expanded={addPanelOpen}
            onClick={() => setAddPanelOpen((prev) => !prev)}
            startIcon={addPanelOpen ? null : <Plus size={12} />}
            endIcon={addPanelOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            sx={addPanelToggleSx(addPanelOpen)}
          >
            {addPanelOpen ? 'Close' : 'Add Item'}
          </Button>
        </Box>

        {addPanelOpen ? (
          <Box sx={{ pt: 0.75, borderTop: 1, borderColor: 'divider' }}>
            <SearchField
              placeholder="Search 2024 items by name, source, type, property..."
              value={search}
              onChange={setSearch}
              iconSize={14}
              sx={{ ...compactInputSx, mb: 0.5 }}
            />

            <InventoryFilterButtons value={filter} onChange={setFilter} />

            <ItemFilterPanel {...addList.panelProps} sx={{ mb: 0.6 }} />

            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic', mb: 0.3 }}>
              {deferredSearch !== search
                ? 'Updating results...'
                : `${searchResults.length} of ${itemsDb.length} items`}
            </Typography>
            <SearchResultsList items={searchResults} itemsDbCount={itemsDb.length} onAddItem={addItem} resetKey={searchResetKey} />

            <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <TextField size="small" value={customName} placeholder="Add custom item..." onChange={(event) => setCustomName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }}
                sx={{ ...compactInputSx, flex: 1, minWidth: 120 }} />
              <TextField size="small" value={customWeight} placeholder="lb" onChange={(event) => setCustomWeight(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }}
                inputProps={{ inputMode: 'decimal' }} sx={{ ...compactInputSx, width: 58 }} />
              <TextField size="small" type="number" value={customValue} placeholder="gp" onChange={(event) => setCustomValue(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }}
                inputProps={{ min: 0, step: 0.01 }} sx={{ ...compactInputSx, width: 62 }} />
              <Button size="small" onClick={addCustom} disabled={!customName.trim()}
                sx={{ px: '14px', border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'rgba(35,32,26,1)', color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.65rem', whiteSpace: 'nowrap', '&:hover': { borderColor: '#caa550', color: '#caa550' } }}>
                + Add
              </Button>
            </Box>
          </Box>
        ) : null}
      </Box>

      <Box sx={{ ...inventorySectionSx, mb: 0 }}>
        <Box sx={{ ...inventorySectionHeaderSx, mb: 0.75 }}>
          <InventorySectionTitle icon={Package} label={`Inventory (${inventoryFiltered ? `${visibleTotalItems} / ` : ''}${totalItems})`} />
        </Box>

        <SearchField
          placeholder="Search inventory by name, source, type, property..."
          value={inventorySearch}
          onChange={setInventorySearch}
          iconSize={14}
          sx={{ ...compactInputSx, mb: 0.5 }}
        />

        <InventoryFilterButtons value={inventoryFilter} onChange={setInventoryFilter} filters={INVENTORY_FILTERS} />

        <ItemFilterPanel {...inventoryList.panelProps} sx={{ mb: 0.6 }} />

        <Box {...inventoryPage.listProps} sx={inventoryListSx}>
          {GROUPS.map((group) => {
            const inGroup = groupedInventory[group.key] || [];
            if (!inGroup.length) return null;
            return (
              <Box key={group.key}>
                <SectionHeader icon={group.icon} label={group.label} />
                {group.key === 'weapon' && slotWarnings.length > 0 ? slotWarnings.map((w, i) => (
                  <Alert key={i} severity="warning" sx={{ fontSize: '0.65rem', py: '2px', px: '8px', mb: '3px' }}>
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
                    attunement={rowAttunement}
                    actions={rowActions}
                  />
                ))}
              </Box>
            );
          })}
          {inventoryPage.remaining > 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <ShowMoreButton remaining={inventoryPage.remaining} onClick={inventoryPage.showMore} />
            </Box>
          ) : null}
          {!inv.length && <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic', py: 0.5 }}>Inventory empty.</Typography>}
          {inv.length > 0 && !visibleInventory.length && (
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic', py: 0.5 }}>
              No inventory items match this search or filter.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function InventorySectionTitle({ icon: Icon, label }) {
  return (
    <Typography sx={inventorySectionTitleSx}>
      {Icon ? <Icon size={12} /> : null}
      {label}
    </Typography>
  );
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: 1, borderColor: 'divider', pb: '3px', mt: 0.6, mb: 0.4 }}>
      {Icon ? <Icon size={12} /> : null}
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
    if (!item || !item.equipped || !['LA', 'MA', 'HA', 'S'].includes(item.type) || !C) return '';
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

const statPillSx = {
  bgcolor: 'rgba(35,32,26,1)',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  px: '10px',
  py: '4px',
  fontSize: '0.8125rem',
  color: 'text.secondary',
  '& b': { color: '#edd48a', fontFamily: '"Cinzel", Georgia, serif' },
};
