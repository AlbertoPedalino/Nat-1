import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, IconButton, TextField, Tooltip, Typography, Alert } from '@mui/material';
import { Backpack, Check, ChevronDown, ChevronRight, Minus, Package, Plus, Search, Shield, Sparkles, Swords, Trash2, AlertTriangle } from 'lucide-react';
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
import { ItemPropertyTable } from '../../../shared/character/ItemPropertyTable.jsx';
import { getArmorPenalties } from '../logic/armorPenalties.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';

const CURRENCY_TYPES = [
  { key: 'cp', label: 'CP' },
  { key: 'sp', label: 'SP' },
  { key: 'ep', label: 'EP' },
  { key: 'gp', label: 'GP' },
  { key: 'pp', label: 'PP' },
];

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
    ...baseItem
  } = item || {};
  return {
    ...baseItem,
    name: baseItem.name,
    source: baseItem.source || 'Custom',
    type: baseItem.type || 'gear',
    rarity: baseItem.rarity || 'none',
    weight: Number(baseItem.weight || baseItem.weightLb || 0),
    value: Number(baseItem.value || 0),
    qty: Math.max(1, Number(baseItem.qty || baseItem.quantity || 1)),
    equipped: !!baseItem.equipped,
    custom: !!baseItem.custom,
  };
}

function qty(item) {
  return Number(item.qty || item.quantity || 1);
}

function itemFlags(item) {
  return Array.isArray(item?.flags) ? item.flags : [];
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

function formatGp(value) {
  const gp = Number(value || 0) / 100;
  if (!gp) return '';
  return `${Number.isInteger(gp) ? gp : gp.toFixed(2)} GP`;
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
    item?.legacySource,
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

const SEARCH_ROW_HEIGHT = 34;
const SEARCH_OVERSCAN = 8;

let itemsCachePromise = null;

function loadItemsCached() {
  if (!itemsCachePromise) {
    itemsCachePromise = loadItems().then((items) => (items || []).map(prepareSearchItem));
  }
  return itemsCachePromise;
}

const SearchResultsList = memo(function SearchResultsList({ items, itemsDbCount, onAddItem }) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = 260;
  const visibleCount = Math.ceil(viewportHeight / SEARCH_ROW_HEIGHT) + SEARCH_OVERSCAN * 2;
  const start = Math.max(0, Math.floor(scrollTop / SEARCH_ROW_HEIGHT) - SEARCH_OVERSCAN);
  const end = Math.min(items.length, start + visibleCount);
  const visibleItems = items.slice(start, end);
  const topPad = start * SEARCH_ROW_HEIGHT;
  const bottomPad = Math.max(0, (items.length - end) * SEARCH_ROW_HEIGHT);

  return (
    <Box
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      sx={{ maxHeight: viewportHeight, overflowY: 'auto', mb: 0.75, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'rgba(18,16,14,0.65)' }}
    >
      {topPad ? <Box sx={{ height: topPad }} /> : null}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', p: '2px' }}>
        {visibleItems.map((item) => (
          <Box key={`${item.name}-${item.source}`} onClick={() => onAddItem(item)}
            sx={{ height: SEARCH_ROW_HEIGHT - 2, display: 'flex', alignItems: 'center', gap: 1, px: '10px', py: '4px', bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, cursor: 'pointer', '&:hover': { borderColor: '#caa550', bgcolor: 'rgba(44,40,33,1)' } }}>
            <ItemNameIcon item={item} />
            <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem', color: 'text.primary' }}>{item.name}</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: '#edd48a', flexShrink: 0, fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em' }}>{item.source || '—'}</Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', flexShrink: 0 }}>{item.type || 'gear'}</Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', flexShrink: 0 }}>{formatGp(item.value)}</Typography>
          </Box>
        ))}
      </Box>
      {bottomPad ? <Box sx={{ height: bottomPad }} /> : null}
      {!items.length && (
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic', py: 0.75, px: 1 }}>
          {itemsDbCount ? 'No items found.' : 'Loading items.'}
        </Typography>
      )}
    </Box>
  );
});

export default function InventoryTab({ C, sheet, onUpdateInventory, onUpdateCurrency }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filter, setFilter] = useState('all');
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
  const groupedInventory = useMemo(() => {
    const groups = Object.fromEntries(GROUPS.map((group) => [group.key, []]));
    resolvedInv.forEach((entry) => {
      if (groups[entry.type]) groups[entry.type].push(entry);
    });
    return groups;
  }, [resolvedInv]);
  const slotWarnings = useMemo(() => getSlotConflictWarnings(inv), [inv]);
  const inventoryStats = useMemo(() => {
    const totalItems = inv.reduce((sum, item) => sum + qty(item), 0);
    const totalWeight = inv.reduce((sum, item) => sum + Number(item.weight || item.weightLb || 0) * qty(item), 0);
    const totalGp = inv.reduce((sum, item) => sum + (Number(item.value || 0) / 100) * qty(item), 0);
    return { totalItems, totalWeight, totalGp };
  }, [inv]);
  const { totalItems, totalWeight, totalGp } = inventoryStats;
  const maxCarry = useMemo(() => Math.max(1, getFinal(C, 'str') * 15), [C]);
  const carryPct = Math.min(100, (totalWeight / maxCarry) * 100);
  const overloaded = totalWeight > maxCarry;
  const profSets = useProficiencySets();

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

  const addItem = useCallback((item) => {
    if (!item?.name) return;
    const current = invRef.current || [];
    updateInv(addInventoryEntries(current, [item], itemsDb, normalizeStoredItem));
  }, [itemsDb, updateInv]);

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    addItem({
      name,
      source: 'Custom',
      type: 'gear',
      custom: true,
      weight: Number(customWeight || 0),
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

  const updateCoin = useCallback((coin, value) => {
    const next = { ...currency, [coin]: Math.max(0, Number(value || 0)) };
    onUpdateCurrency?.(next);
  }, [currency, onUpdateCurrency]);

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '5px', mb: 0.75 }}>
        {CURRENCY_TYPES.map((ct) => (
          <Box key={ct.key} sx={{ bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, p: '5px 4px', textAlign: 'center' }}>
            <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', letterSpacing: '0.08em', mb: '3px', color: 'text.secondary' }}>{ct.label}</Typography>
            <TextField
              type="number"
              variant="standard"
              value={currency[ct.key] || 0}
              onChange={(event) => updateCoin(ct.key, event.target.value)}
              inputProps={{ min: 0 }}
              sx={{
                width: '100%',
                '& input': { textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.875rem', fontWeight: 700, color: '#edd48a', py: '2px' },
              }}
            />
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
        <Box sx={statPillSx}>Weight: <b>{totalWeight.toFixed(1)} / {maxCarry} lb</b></Box>
        <Box sx={statPillSx}>Value: <b>{totalGp.toFixed(1)} GP</b></Box>
        <Box sx={{ width: '100%', mt: 0.3 }}>
          <Box sx={{ height: 6, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden', border: 1, borderColor: 'divider' }}>
            <Box sx={{ width: `${carryPct}%`, height: '100%', bgcolor: overloaded ? '#de675f' : '#58b879' }} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', mt: 0.25 }}>
            <Box sx={{ color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif' }}>{totalWeight.toFixed(1)} / {maxCarry} lb</Box>
            <Box sx={{ px: 0.75, py: '1px', borderRadius: 1, bgcolor: overloaded ? 'rgba(222,103,95,0.14)' : 'rgba(63,166,108,0.14)', color: overloaded ? '#de675f' : '#58b879', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.6rem' }}>
              {overloaded ? 'Over Capacity' : 'OK'}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        onClick={() => setAddPanelOpen((prev) => !prev)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          fontFamily: '"Cinzel", Georgia, serif',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: addPanelOpen ? '#edd48a' : 'text.secondary',
          borderBottom: 1,
          borderColor: 'divider',
          pb: '3px',
          mt: 0.4,
          mb: 0.5,
          userSelect: 'none',
          '&:hover': { color: '#caa550' },
        }}
      >
        {addPanelOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Search size={12} />
        Add Items
      </Box>

      {addPanelOpen ? (
        <>
          <TextField
            size="small"
            fullWidth
            placeholder="Search 2024 items by name, source, type, property..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ ...compactInputSx, mb: 0.5 }}
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mb: 0.6 }}>
            {FILTERS.map((filterDef) => {
              const Icon = filterDef.icon;
              return (
                <Button
                  key={filterDef.key}
                  size="small"
                  onClick={() => setFilter(filterDef.key)}
                  startIcon={Icon ? <Icon size={12} /> : null}
                  sx={{
                    minHeight: 0,
                    px: '10px',
                    py: '3px',
                    border: 1,
                    borderColor: filter === filterDef.key ? '#caa550' : 'divider',
                    borderRadius: 999,
                    bgcolor: filter === filterDef.key ? 'rgba(202,165,80,0.12)' : 'transparent',
                    color: filter === filterDef.key ? '#edd48a' : 'text.secondary',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontSize: '0.56rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {filterDef.label}
                </Button>
              );
            })}
          </Box>

          {deferredSearch !== search ? (
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic', mb: 0.3 }}>
              Updating results...
            </Typography>
          ) : null}
          <SearchResultsList items={searchResults} itemsDbCount={itemsDb.length} onAddItem={addItem} />

          <Box sx={{ display: 'flex', gap: '6px', mb: 0.75, flexWrap: 'wrap' }}>
            <TextField size="small" value={customName} placeholder="Add custom item..." onChange={(event) => setCustomName(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }}
              sx={{ ...compactInputSx, flex: 1, minWidth: 120 }} />
            <TextField size="small" type="number" value={customWeight} placeholder="lb" onChange={(event) => setCustomWeight(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }}
              inputProps={{ min: 0, step: 0.1 }} sx={{ ...compactInputSx, width: 58 }} />
            <TextField size="small" type="number" value={customValue} placeholder="gp" onChange={(event) => setCustomValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addCustom(); }}
              inputProps={{ min: 0, step: 0.01 }} sx={{ ...compactInputSx, width: 62 }} />
            <Button size="small" onClick={addCustom} disabled={!customName.trim()}
              sx={{ px: '14px', border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'rgba(35,32,26,1)', color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.65rem', whiteSpace: 'nowrap', '&:hover': { borderColor: '#caa550', color: '#caa550' } }}>
              + Add
            </Button>
          </Box>
        </>
      ) : null}

      <SectionHeader icon={Package} label={`Inventory (${totalItems} items)`} />

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

              />
            ))}
          </Box>
        );
      })}
      {!inv.length && <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic', py: 0.5 }}>Inventory empty.</Typography>}
    </Box>
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

const InventoryRow = memo(function InventoryRow({ item, index, onQty, onRemove, onEquip, onEquipSlot, penaltyMsg, canPactWeapon, onPactWeapon, isArmorer, hasArcaneArmor, onArcaneArmor }) {
  const [open, setOpen] = useState(false);
  const type = String(item.type || '').toUpperCase();
  const canEquip = ['M', 'R', 'LA', 'MA', 'HA', 'S', 'SCF', 'WD', 'RD', 'ST', 'WI', 'WEAPON', 'ARMOR'].includes(type);

  const hasEntries = open && Array.isArray(item.entries) && item.entries.length > 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', px: '10px', py: '6px', bgcolor: item.equipped ? 'rgba(26,188,156,0.06)' : 'rgba(35,32,26,1)', border: 1, borderColor: penaltyMsg ? 'warning.main' : (item.equipped ? '#2ca797' : 'divider'), borderRadius: 1, mb: '3px', '&:hover': { borderColor: 'rgba(202,165,80,0.34)' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Box onClick={() => setOpen(!open)} sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
              <ItemNameIcon item={item} />
              <Typography noWrap sx={{ fontSize: '0.875rem', color: 'text.primary' }}>{item.name}</Typography>
              {item.custom ? <Box component="span" sx={{ fontSize: '0.56rem', color: 'text.secondary' }}>[custom]</Box> : null}
              {hasItemFlag(item, 'pactWeapon') ? <Box component="span" sx={{ ml: 0.5, fontSize: '0.56rem', color: '#9d7fb8', fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em' }}>[Pact Weapon]</Box> : null}
              {hasItemFlag(item, 'arcaneArmor') ? <Box component="span" sx={{ ml: 0.5, fontSize: '0.56rem', color: '#58b879', fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em' }}>[Arcane Armor]</Box> : null}
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
      {open ? (
        <Box sx={{ fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.45, bgcolor: '#12100e', border: 1, borderColor: 'divider', borderRadius: 1, px: '10px', py: '6px', mt: '-2px', mb: '4px' }}>
          <ItemPropertyTable item={item} sx={{ mb: hasEntries ? '6px' : 0 }} />
          {hasEntries ? <Box sx={{ mt: '6px' }}><EntryBlocks entries={item.entries} emptyText="" /></Box> : null}
        </Box>
      ) : null}
    </Box>
  );
});

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
