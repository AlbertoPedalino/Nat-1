import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, IconButton, TextField, Tooltip, Typography, Alert } from '@mui/material';
import { Backpack, Check, ChevronDown, ChevronRight, Minus, Package, Plus, Shield, Sparkles, Swords, Trash2, AlertTriangle } from 'lucide-react';
import { loadItems } from '../../charbuilder/logic/dataLoaders.js';
import { getFinal } from '../logic/calculations.js';
import {
  isWeapon,
  canOneHand,
  canTwoHand,
  equipToSlot as equipToSlotHelper,
  getSlotConflictWarnings,
} from '../logic/equipmentSlots.js';

import { ItemNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';
import { INVENTORY_SOURCE_PRIORITY, sourceRank } from '../../../shared/character/sourcePriority.js';
import { addInventoryEntries } from '../../../shared/character/itemContainers.js';
import {
  attunementRequirementText,
  countAttunedItems,
  getAttunementEligibility,
  toggleItemAttunement,
} from '../../../shared/character/itemAttunement.js';
import { isConsumableTome, extractTomeBonus, hasAbilityChoice, getAbilityChoiceGroups } from '../../../shared/character/itemEffects.js';
import { getArmorPenalties } from '../logic/armorPenalties.js';
import { getCharacterAttunementState } from '../logic/attunement.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import { CurrencyRow } from '../../../shared/character/CurrencyCoinBox.jsx';
import { setCoinAmount, updateCustomCurrency } from '../../../shared/character/currency.js';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';
import { ItemReferenceBody, QuantityAdder } from '../../../shared/character/ItemReference.jsx';
import { carryCapacity, formatWeight, itemQty as qty, totalCarriedWeight } from '../../../shared/character/weight.js';
import { useSheetActions } from '../context/SheetActionsContext.jsx';
import { CRAFTED_FLAG_META, craftedFlagOf } from '../../../shared/character/craftedItems.js';

const FILTERS = [
  { key: 'all', label: 'All', icon: null },
  { key: 'weapon', label: 'Weapons', icon: Swords },
  { key: 'armor', label: 'Armor', icon: Shield },
  { key: 'gear', label: 'Gear', icon: Backpack },
  { key: 'magic', label: 'Magic', icon: Sparkles },
];

const GROUPS = [
  { key: 'weapon', label: 'Weapons', icon: Swords },
  { key: 'armor', label: 'Armor', icon: Shield },
  { key: 'magic', label: 'Magic', icon: Sparkles },
  { key: 'gear', label: 'Gear', icon: Backpack },
];


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

function itemType(item) {
  const type = String(item?.type || '').toUpperCase();
  if (['M', 'R'].includes(type) || type === 'WEAPON') return 'weapon';
  if (['LA', 'MA', 'HA', 'S'].includes(type) || type === 'ARMOR') return 'armor';
  if (type === 'RG' || (item?.rarity && item.rarity !== 'none')) return 'magic';
  return 'gear';
}

function normalizeStoredItem(item) {
  const {
    _itemType,
    _searchName,
    _searchText,
    _sourcePriority,
    _rarityPriority,
    quantity: _sourceQuantity,
    weightLb: _sourceWeightLb,
    ...baseItem
  } = item || {};
  return {
    ...baseItem,
    name: baseItem.name,
    source: baseItem.source || 'Custom',
    type: baseItem.type || 'gear',
    rarity: baseItem.rarity || 'none',
    weight: Number(baseItem.weight ?? 0),
    value: Number(baseItem.value || 0),
    qty: Math.max(1, Number(baseItem.qty ?? 1) || 1),
    equipped: !!baseItem.equipped,
    custom: !!baseItem.custom,
  };
}

function itemFlags(item) {
  return Array.isArray(item?.flags) ? item.flags : [];
}

function parseDecimalInput(value) {
  const parsed = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasItemFlag(item, flag) {
  return itemFlags(item).includes(flag);
}

function hasWarlockInvocation(C, name) {
  if (!C?.choices) return false;
  return Object.entries(C.choices).some(([key, value]) => (
    key.replace(/^mc\d+_/, '').startsWith('warlock_invocation_')
    && String(value || '').split('|')[0].trim() === name
  ));
}

function canUsePactWeaponFlag(C, item) {
  if (!C || !item) return false;
  const type = String(item.type || '').toUpperCase();
  if (!['M', 'R', 'WEAPON'].includes(type)) return false;
  const hasWarlock = C.className === 'Warlock' || (C.extraClasses || []).some((extra) => extra?.name === 'Warlock');
  return hasWarlock && hasWarlockInvocation(C, 'Pact of the Blade');
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
    _searchName: normalizeSearch(item?.name),
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

const SEARCH_CAP = 120;

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

const SearchResultsList = memo(function SearchResultsList({ items, itemsDbCount, onAddItem }) {
  const visibleItems = items.slice(0, SEARCH_CAP);
  return (
    <Box sx={{ maxHeight: 320, overflowY: 'auto', mb: 0.75, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'rgba(18,16,14,0.65)', p: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {visibleItems.map((item) => (
        <AddResultRow key={`${item.name}-${item.source}`} item={item} onAdd={onAddItem} />
      ))}
      {items.length > SEARCH_CAP ? (
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic', px: 1, py: 0.5 }}>
          {items.length - SEARCH_CAP} more. Refine your search.
        </Typography>
      ) : null}
      {!items.length && (
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic', py: 0.75, px: 1 }}>
          {itemsDbCount ? 'No items found.' : 'Loading items.'}
        </Typography>
      )}
    </Box>
  );
});

function InventoryFilterButtons({ value, onChange }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mb: 0.6 }}>
      {FILTERS.map((filterDef) => {
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

  const resolvedInv = useMemo(() => inv.map((item, index) => ({ item, index, type: itemType(item) })), [inv]);
  const visibleInventory = useMemo(() => {
    const q = deferredInventorySearch.trim();
    return resolvedInv.filter((entry) => {
      if (inventoryFilter !== 'all' && entry.type !== inventoryFilter) return false;
      return itemMatchesSearch(entry.item, q);
    });
  }, [deferredInventorySearch, inventoryFilter, resolvedInv]);
  const groupedInventory = useMemo(() => {
    const groups = Object.fromEntries(GROUPS.map((group) => [group.key, []]));
    visibleInventory.forEach((entry) => {
      if (groups[entry.type]) groups[entry.type].push(entry);
    });
    // Sort each group alphabetically by name; the original inventory index stays
    // attached to each entry, so qty/equip/remove keep targeting the right item.
    Object.values(groups).forEach((entries) => {
      entries.sort((a, b) => String(a.item?.name || '').localeCompare(String(b.item?.name || ''), undefined, { sensitivity: 'base' }));
    });
    return groups;
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
  const inventoryFiltered = inventoryFilter !== 'all' || deferredInventorySearch.trim().length > 0;
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
    let items = itemsDb;
    if (filter !== 'all') items = items.filter((item) => item._itemType === filter);
    if (q) {
      items = items.filter((item) => itemMatchesPreparedSearch(item, q));
      return [...items].sort(compareItemsBySearch(q));
    }
    return items;
  }, [itemsDb, deferredSearch, filter]);

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
    if (!target) return;
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
    const next = equipToSlotHelper(current, index, slot);
    updateInv(next);
  }, [updateInv]);

  const togglePactWeapon = useCallback((index) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!canUsePactWeaponFlag(C, target)) return;
    const next = current.map((item, idx) => {
      const flags = itemFlags(item).filter((flag) => flag !== 'pactWeapon');
      if (idx !== index) return flags.length === itemFlags(item).length ? item : { ...item, flags };
      const shouldSet = !hasItemFlag(item, 'pactWeapon');
      return { ...item, flags: shouldSet ? [...flags, 'pactWeapon'] : flags };
    });
    updateInv(next);
  }, [C, updateInv]);

  const isArmorer = useMemo(() => {
    if (!C) return false;
    const cls = String(C.className || '').toLowerCase();
    const sub = String(C.subclassShortName || '').toLowerCase();
    const lv = Number(C.classLevel || C.level || 1);
    if (cls === 'artificer' && sub === 'armorer' && lv >= 3) return true;
    return (C.extraClasses || []).some((ec) => String(ec.name || '').toLowerCase() === 'artificer' && String(ec.subclassShortName || '').toLowerCase() === 'armorer' && (ec.level || 1) >= 3);
  }, [C]);

  const _isArcaneEligible = (item) => {
    const t = String(item.type || '').toUpperCase();
    if (['S', 'SHIELD'].includes(t)) return false;
    const n = String(item.name || '').toLowerCase();
    if (n === 'shield' || n.endsWith(' shield')) return false;
    const b = String(item.baseItem || '').toLowerCase();
    if (b === 'shield' || b.endsWith(' shield')) return false;
    return ['LA', 'MA', 'HA'].includes(t);
  };

  const toggleArcaneArmor = useCallback((index) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!_isArcaneEligible(target)) return;
    const alreadyHas = hasItemFlag(target, 'arcaneArmor');
    const next = current.map((item, idx) => {
      if (idx !== index) {
        if (alreadyHas) return item;
        const flags = itemFlags(item).filter((flag) => flag !== 'arcaneArmor');
        return { ...item, flags };
      }
      const flags = itemFlags(item).filter((flag) => flag !== 'arcaneArmor');
      if (alreadyHas) return { ...item, flags };
      return { ...item, flags: [...flags, 'arcaneArmor'] };
    });
    updateInv(next);
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
            <TextField
              size="small"
              fullWidth
              placeholder="Search 2024 items by name, source, type, property..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ ...compactInputSx, mb: 0.5 }}
            />

            <InventoryFilterButtons value={filter} onChange={setFilter} />

            {deferredSearch !== search ? (
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic', mb: 0.3 }}>
                Updating results...
              </Typography>
            ) : null}
            <SearchResultsList items={searchResults} itemsDbCount={itemsDb.length} onAddItem={addItem} />

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

        <TextField
          size="small"
          fullWidth
          placeholder="Search inventory by name, source, type, property..."
          value={inventorySearch}
          onChange={(event) => setInventorySearch(event.target.value)}
          sx={{ ...compactInputSx, mb: 0.5 }}
        />

        <InventoryFilterButtons value={inventoryFilter} onChange={setInventoryFilter} />

        <Box sx={inventoryListSx}>
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
                    onQty={adjustQty}
                    onRemove={removeItem}
                    onEquip={toggleEquipped}
                    onEquipSlot={equipToSlot}
                    penaltyMsg={getPenaltyMessage(C, item, profSets)}
                    canPactWeapon={canUsePactWeaponFlag(C, item)}
                    onPactWeapon={togglePactWeapon}
                    isArmorer={isArmorer}
                    hasArcaneArmor={hasItemFlag(item, 'arcaneArmor')}
                    onArcaneArmor={toggleArcaneArmor}
                    onAttune={toggleAttuned}
                    attunementFull={attunementFull}
                    character={C}
                    attunementContext={attunementState.context}
                    attunementLimit={attunementState.limit}
                    onSetAbilityChoice={setAbilityChoice}
                    onConsumeTome={consumeTome}
                  />
                ))}
              </Box>
            );
          })}
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

const InventoryRow = memo(function InventoryRow({ item, index, onQty, onRemove, onEquip, onEquipSlot, penaltyMsg, canPactWeapon, onPactWeapon, isArmorer, hasArcaneArmor, onArcaneArmor, onAttune, attunementFull, character, attunementContext, attunementLimit, onSetAbilityChoice, onConsumeTome }) {
  const type = String(item.type || '').toUpperCase();
  const canEquip = ['M', 'R', 'LA', 'MA', 'HA', 'S', 'SCF', 'WD', 'RD', 'ST', 'WI', 'WEAPON', 'ARMOR'].includes(type);

  const showAbilityChoice = hasAbilityChoice(item);
  const showTomeConsume = isConsumableTome(item);
  const rowBorderColor = penaltyMsg ? 'warning.main' : (item.equipped ? '#2ca797' : 'divider');

  return (
    <ExpandableCard
      containerSx={{ mb: '4px', overflow: 'hidden' }}
      detailsSx={{ fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.45, bgcolor: '#12100e', border: 1, borderTop: 'none', borderColor: rowBorderColor, borderRadius: '0 0 8px 8px', px: '10px', py: '6px', mt: 0, mb: 0 }}
      details={(
        <>
          <ItemReferenceBody item={item} />
          {showTomeConsume ? (
            <TomeConsumePanel item={item} onConsume={() => onConsumeTome?.(index)} />
          ) : null}
          {showAbilityChoice ? (
            <AbilityChoicePanel
              item={item}
              onPick={(groupIdx, abilities) => onSetAbilityChoice?.(index, groupIdx, abilities)}
            />
          ) : null}
        </>
      )}
      summary={({ toggle, open }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', px: '10px', py: '6px', bgcolor: item.equipped ? 'rgba(26,188,156,0.06)' : 'rgba(35,32,26,1)', border: 1, borderColor: rowBorderColor, borderRadius: open ? '8px 8px 0 0' : 1, mb: 0, '&:hover': { borderColor: 'rgba(202,165,80,0.34)' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Box onClick={toggle} sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
              <ItemNameIcon item={item} />
              <Typography noWrap sx={{ fontSize: '0.875rem', color: 'text.primary' }}>{item.name}</Typography>
              {item.custom ? <Box component="span" sx={{ fontSize: '0.56rem', color: 'text.secondary' }}>[custom]</Box> : null}
              {(() => {
                const meta = CRAFTED_FLAG_META[craftedFlagOf(item)];
                return meta ? <Box component="span" sx={{ ml: 0.5, fontSize: '0.56rem', color: meta.color, fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em' }}>[{meta.label}]</Box> : null;
              })()}
              {hasItemFlag(item, 'pactWeapon') ? <Box component="span" sx={{ ml: 0.5, fontSize: '0.56rem', color: '#9d7fb8', fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em' }}>[Pact Weapon]</Box> : null}
              {hasItemFlag(item, 'arcaneArmor') ? <Box component="span" sx={{ ml: 0.5, fontSize: '0.56rem', color: '#58b879', fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em' }}>[Arcane Armor]</Box> : null}
              {item.attuned ? <Box component="span" sx={{ ml: 0.5, fontSize: '0.56rem', color: '#d69245', fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em' }}>[Attuned]</Box> : null}
            </Box>
            {penaltyMsg && (
              <Typography sx={{ fontSize: '0.6rem', color: 'warning.main', mt: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={10} /> {penaltyMsg}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', flexWrap: 'wrap' }}>
          {isWeapon(item) ? (
            <Box sx={{ display: 'flex', gap: '2px' }}>
              {canOneHand(item) ? (
                <SlotBtn active={item.equippedSlot === 'mainHand'} onClick={() => onEquipSlot(index, 'mainHand')} label="MH" />
              ) : null}
              {canOneHand(item) ? (
                <SlotBtn active={item.equippedSlot === 'offHand'} onClick={() => onEquipSlot(index, 'offHand')} label="OH" />
              ) : null}
              {canTwoHand(item) ? (
                <SlotBtn active={item.equippedSlot === 'twoHands'} onClick={() => onEquipSlot(index, 'twoHands')} label="2H" />
              ) : null}
            </Box>
          ) : canEquip ? (
            <Button size="small" onClick={() => onEquip(index)} startIcon={item.equipped ? <Check size={11} /> : null}
              sx={{ minWidth: 0, px: '7px', py: '2px', border: 1, borderColor: item.equipped ? '#2ca797' : 'divider', borderRadius: '3px', color: item.equipped ? '#2ca797' : 'text.secondary', bgcolor: item.equipped ? 'rgba(26,188,156,0.12)' : 'transparent', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.58rem' }}>
              {item.equipped ? 'Equip.' : 'Equip'}
            </Button>
          ) : null}
          {canPactWeapon ? (
            <Button size="small" onClick={() => onPactWeapon(index)} startIcon={hasItemFlag(item, 'pactWeapon') ? <Check size={11} /> : null}
              sx={{ minWidth: 0, px: '7px', py: '2px', border: 1, borderColor: hasItemFlag(item, 'pactWeapon') ? '#9d7fb8' : 'divider', borderRadius: '3px', color: hasItemFlag(item, 'pactWeapon') ? '#9d7fb8' : 'text.secondary', bgcolor: hasItemFlag(item, 'pactWeapon') ? 'rgba(157,127,184,0.14)' : 'transparent', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.58rem' }}>
              {hasItemFlag(item, 'pactWeapon') ? 'Pact' : 'Pact Weapon'}
            </Button>
          ) : null}
          {isArmorer && (() => { const t = String(item.type || '').toUpperCase(); const n = String(item.name || '').toLowerCase(); return ['LA', 'MA', 'HA'].includes(t) && !['S', 'SHIELD'].includes(t) && n !== 'shield' && !n.endsWith(' shield'); })() ? (
            <Button size="small" onClick={() => onArcaneArmor(index)} startIcon={hasArcaneArmor ? <Check size={11} /> : null}
              sx={{ minWidth: 0, px: '7px', py: '2px', border: 1, borderColor: hasArcaneArmor ? '#58b879' : 'divider', borderRadius: '3px', color: hasArcaneArmor ? '#58b879' : 'text.secondary', bgcolor: hasArcaneArmor ? 'rgba(88,184,121,0.14)' : 'transparent', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.58rem' }}>
              {hasArcaneArmor ? 'Arcane' : 'Arcane Armor'}
            </Button>
          ) : null}
          {item.reqAttune ? (
            <AttuneButton item={item} index={index} attunementFull={attunementFull} character={character} attunementContext={attunementContext} attunementLimit={attunementLimit} onAttune={onAttune} />
          ) : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, ml: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <QtyButton onClick={() => onQty(index, -1)}><Minus size={12} /></QtyButton>
              <Box sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.8125rem', fontWeight: 700, color: '#edd48a', minWidth: 18, textAlign: 'center' }}>{qty(item)}</Box>
              <QtyButton onClick={() => onQty(index, 1)}><Plus size={12} /></QtyButton>
            </Box>
            <Tooltip title="Remove">
              <span>
                <QtyButton danger onClick={() => onRemove(index)}><Trash2 size={12} /></QtyButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>
      )}
    />
  );
});

const ABILITY_LABEL = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

function TomeConsumePanel({ item, onConsume }) {
  const bonus = extractTomeBonus(item);
  if (!bonus) return null;
  return (
    <Box sx={{ mt: '8px', pt: '8px', borderTop: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ flex: 1, fontSize: '0.66rem', color: 'text.secondary' }}>
        Read & study to permanently gain <b style={{ color: '#edd48a' }}>+{bonus.value} {ABILITY_LABEL[bonus.ability]}</b>. The book then loses its magic.
      </Typography>
      <Button size="small" variant="outlined" onClick={onConsume}
        sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.6rem', letterSpacing: '0.06em', borderColor: '#edd48a', color: '#edd48a', '&:hover': { bgcolor: 'rgba(237,212,138,0.08)', borderColor: '#edd48a' } }}>
        Read & Consume
      </Button>
    </Box>
  );
}

function AbilityChoicePanel({ item, onPick }) {
  const groups = getAbilityChoiceGroups(item);
  if (!groups.length) return null;
  const stored = (item.abilityChoice && typeof item.abilityChoice === 'object') ? item.abilityChoice : {};

  return (
    <Box sx={{ mt: '8px', pt: '8px', borderTop: '1px dashed', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: '0.6rem', color: '#edd48a', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, letterSpacing: '0.08em', mb: 0.3 }}>
        Ability Choice
      </Typography>
      {groups.map((group, groupIdx) => {
        const from = Array.isArray(group.from) ? group.from : [];
        const count = Math.max(1, Number(group.count || 1));
        const amount = group.amount ?? 2;
        const current = Array.isArray(stored[groupIdx]) ? stored[groupIdx] : (stored[groupIdx] ? [stored[groupIdx]] : []);

        const togglePick = (abil) => {
          const exists = current.includes(abil);
          let next;
          if (exists) next = current.filter((a) => a !== abil);
          else next = count === 1 ? [abil] : [...current, abil].slice(-count);
          onPick(groupIdx, next);
        };

        return (
          <Box key={groupIdx} sx={{ mb: 0.4 }}>
            <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', mb: 0.25 }}>
              Pick {count} (+{amount} each)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
              {from.map((abil) => {
                const isOn = current.includes(abil);
                return (
                  <Button key={abil} size="small" variant={isOn ? 'contained' : 'outlined'}
                    onClick={() => togglePick(abil)}
                    sx={{ minWidth: 0, px: '8px', py: '2px', fontSize: '0.6rem', fontFamily: '"Cinzel", Georgia, serif',
                      ...(isOn ? { bgcolor: 'rgba(237,212,138,0.18)', color: '#edd48a', borderColor: '#edd48a' } : { color: 'text.secondary' }) }}>
                    {ABILITY_LABEL[abil] || abil.toUpperCase()}
                  </Button>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function QtyButton({ children, danger = false, onClick }) {
  return (
    <IconButton size="small" onClick={onClick}
      sx={{ width: 20, height: 20, border: 1, borderColor: 'divider', borderRadius: '3px', color: 'text.secondary', '&:hover': { borderColor: danger ? '#de675f' : '#caa550', color: danger ? '#de675f' : '#caa550' } }}>
      {children}
    </IconButton>
  );
}

function SlotBtn({ active, onClick, label }) {
  return (
    <IconButton size="small" onClick={onClick}
      sx={{
        width: 24, height: 24,
        border: 1,
        borderColor: active ? '#caa550' : 'divider',
        borderRadius: '3px',
        color: active ? '#edd48a' : 'text.secondary',
        bgcolor: active ? 'rgba(202,165,80,0.14)' : 'transparent',
        fontFamily: '"Cinzel", Georgia, serif',
        fontSize: '0.48rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        '&:hover': { borderColor: '#caa550', color: '#caa550' },
      }}
    >
      {label}
    </IconButton>
  );
}

// Attune toggle for an item requiring attunement. Structured prerequisite
// failures block attunement; unmodeled alternatives remain advisory.
function AttuneButton({ item, index, attunementFull, character, attunementContext, attunementLimit, onAttune }) {
  const reqText = attunementRequirementText(item);
  const eligibility = getAttunementEligibility(item, character, attunementContext);
  const hasRequirementWarning = eligibility.status === 'ineligible' || eligibility.status === 'unknown';
  const blockedByLimit = !item.attuned && attunementFull;
  const blocked = blockedByLimit || (!item.attuned && eligibility.status === 'ineligible');
  const cursedAttuned = Boolean(item.attuned && item.curse);
  const tip = [
    reqText,
    blockedByLimit ? `Attunement limit reached (${attunementLimit})` : null,
    hasRequirementWarning ? eligibility.reason : null,
    cursedAttuned ? 'A cursed item cannot be unattuned voluntarily' : null,
  ].filter(Boolean).join(' · ');
  const accent = item.attuned ? '#d69245' : (hasRequirementWarning ? '#c9923f' : null);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <Tooltip title={tip} arrow>
        <span>
          <Button size="small" disabled={blocked} onClick={() => onAttune?.(index)}
            startIcon={cursedAttuned ? <AlertTriangle size={11} /> : (item.attuned ? <Check size={11} /> : (hasRequirementWarning ? <AlertTriangle size={11} /> : null))}
            sx={{ minWidth: 0, px: '7px', py: '2px', border: 1, borderColor: accent || 'divider', borderRadius: '3px', color: accent || 'text.secondary', bgcolor: item.attuned ? 'rgba(214,146,69,0.14)' : 'transparent', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.58rem', '&.Mui-disabled': { opacity: 0.4 } }}>
            {cursedAttuned ? 'Cursed' : (item.attuned ? 'Attuned' : 'Attune')}
          </Button>
        </span>
      </Tooltip>
      {cursedAttuned ? (
        <Tooltip title="Use Remove Curse or equivalent magic, then end attunement" arrow>
          <Button size="small" onClick={() => onAttune?.(index, { curseBroken: true })}
            sx={{ minWidth: 0, px: '7px', py: '2px', border: 1, borderColor: '#a75d5d', borderRadius: '3px', color: '#d99292', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.58rem' }}>
            Break Curse & Unattune
          </Button>
        </Tooltip>
      ) : null}
    </Box>
  );
}

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
