import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Divider, IconButton, InputAdornment, List, ListItemButton, ListItemText, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { Backpack, Coins, PackagePlus, Search, Trash2 } from 'lucide-react';
import BuilderPanel from '../components/BuilderPanel.jsx';
import { ITEM_FILTERS } from '../constants.js';
import { ItemNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';
import { cleanText } from '../logic/text.js';
import { equipmentTypeCandidates } from '../logic/dataLoaders.js';
import { CurrencyRow } from '../../../shared/character/CurrencyCoinBox.jsx';
import { findInventoryItem } from '../../../shared/character/itemContainers.js';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';
import { ItemReferenceBody, QuantityAdder } from '../../../shared/character/ItemReference.jsx';
import { formatWeight, totalCarriedWeight } from '../../../shared/character/weight.js';

const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e'];

// Human labels for 5etools `equipmentType` codes that resolve to a player choice.
// Keys must match EQUIPMENT_TYPE_MATCHERS in dataLoaders.js.
const EQUIP_TYPE_LABELS = {
  focusSpellcastingArcane: 'Arcane Focus',
  focusSpellcastingDruidic: 'Druidic Focus',
  focusSpellcastingHoly: 'Holy Symbol',
  instrumentMusical: 'Musical Instrument',
  setGaming: 'Gaming Set',
  toolArtisan: "Artisan's Tools",
  weaponSimple: 'Simple Weapon',
  weaponSimpleMelee: 'Simple Melee Weapon',
  weaponMartial: 'Martial Weapon',
  weaponMartialMelee: 'Martial Melee Weapon',
};

// Cap the non-virtualized add list. Rows are search-driven, so a small cap keeps
// the DOM light; beyond it we show a "refine search" hint.
const ADD_LIST_CAP = 120;

function cpToCoins(cpValue) {
  let cp = Number(cpValue || 0);
  const gp = Math.floor(cp / 100);
  cp %= 100;
  const sp = Math.floor(cp / 10);
  cp %= 10;
  return { gp, sp, cp };
}

function parseItemRef(ref) {
  const [name, source] = String(ref || '').split('|');
  return {
    name: cleanText(name || '').trim(),
    source: String(source || '').trim().toUpperCase(),
  };
}

function itemSearchText(item) {
  return [
    item?.name,
    item?.source,
    item?.sourceAlias,
    item?.type,
    item?.rarity,
    item?.scfType,
    Array.isArray(item?.focus) ? item.focus.join(' ') : '',
    Array.isArray(item?.group) ? item.group.join(' ') : '',
    Array.isArray(item?.items) ? item.items.map((ref) => parseItemRef(ref).name).join(' ') : '',
  ].filter(Boolean).join(' ').toLowerCase();
}

function flattenEquip(node, items = []) {
  if (!node) return items;
  if (typeof node === 'string') {
    items.push(cleanText(node).replace(/\|[a-zA-Z0-9-]+/g, ''));
    return items;
  }
  if (typeof node === 'number') return items;
  if (Array.isArray(node)) {
    node.forEach((item) => flattenEquip(item, items));
    return items;
  }
  if (typeof node === 'object') {
    const choiceKeys = CHOICE_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(node, key));
    const resolved = [...new Set(choiceKeys.map((key) => key.toUpperCase()))].map((key) => (node[key] !== undefined ? key : key.toLowerCase()));
    if (resolved.length > 1) {
      items.push(resolved.map((key) => flattenEquip(node[key], []).join(', ')).join(' or '));
      return items;
    }
    if (node.item) {
      const name = String(node.item || '').split('|')[0];
      const qty = node.quantity && node.quantity > 1 ? ` x${node.quantity}` : '';
      const value = node.containsValue || node.value || 0;
      items.push(`${cleanText(name)}${qty}${value ? ` (${Math.floor(value / 100)} gp)` : ''}`);
    } else if (node.special) items.push(cleanText(node.special));
    else if (node.equipmentType) items.push(cleanText(node.equipmentType));
    else if (node.containsValue || node.value) items.push(`${Math.floor((node.containsValue || node.value) / 100)} gp`);
    else if (node.entries) flattenEquip(node.entries, items);
    else Object.entries(node).forEach(([key, value]) => {
      if (!['source', 'page', 'type'].includes(key)) flattenEquip(value, items);
    });
  }
  return items;
}

function extractEquipItems(node, result = { items: [], cp: 0 }) {
  if (!node) return result;
  if (typeof node === 'string') {
    const gp = node.match(/(\d+)\s*gp/i);
    const sp = node.match(/(\d+)\s*sp/i);
    const cp = node.match(/(\d+)\s*cp/i);
    if (gp) result.cp += Number(gp[1]) * 100;
    else if (sp) result.cp += Number(sp[1]) * 10;
    else if (cp) result.cp += Number(cp[1]);
    else {
      const name = node.replace(/\|[a-zA-Z0-9-]+/g, '').trim();
      if (name) result.items.push({ name, qty: 1 });
    }
    return result;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => extractEquipItems(item, result));
    return result;
  }
  if (typeof node === 'object') {
    if (node.value) result.cp += Number(node.value || 0);
    if (node.containsValue) result.cp += Number(node.containsValue || 0);
    if (node.item) result.items.push({ ...parseItemRef(node.item), qty: node.quantity || 1 });
    else if (node.equipmentType) result.items.push({ ...parseItemRef(node.equipmentType), qty: node.quantity || 1, equipmentType: true });
    else if (node.entries) extractEquipItems(node.entries, result);
    else Object.entries(node).forEach(([key, value]) => {
      if (!['source', 'page', 'type', 'displayName', 'quantity', 'value', 'containsValue'].includes(key)) extractEquipItems(value, result);
    });
  }
  return result;
}

function collectChoiceBlocks(eq, prefix) {
  const blocks = [];
  if (eq?.defaultData?.[0]) {
    const choiceData = eq.defaultData[0];
    const keys = ['A', 'B', 'C', 'D', 'E'].filter((key) => key in choiceData);
    if (keys.length > 1) {
      blocks.push({
        key: `${prefix}_choice_0`,
        label: 'Choose option',
        options: keys.map((key) => ({ value: key, label: flattenEquip(choiceData[key], []).join(', ') || key, node: choiceData[key] })),
      });
      return blocks;
    }
  }

  let index = 0;
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const keys = CHOICE_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(node, key));
    const resolved = [...new Set(keys.map((key) => key.toUpperCase()))].map((key) => (node[key] !== undefined ? key : key.toLowerCase()));
    if (resolved.length > 1) {
      blocks.push({
        key: `${prefix}_choice_${index}`,
        label: 'Choose option',
        options: resolved.map((key) => ({ value: key, label: flattenEquip(node[key], []).join(', ') || key.toUpperCase(), node: node[key] })),
      });
      index += 1;
      return;
    }
    Object.entries(node).forEach(([key, value]) => {
      if (!['source', 'page', 'type'].includes(key)) visit(value);
    });
  };
  visit(eq);
  return blocks;
}

function resolveEquipmentItems(extracted, itemDb) {
  const out = [];
  extracted.items.forEach((item) => {
    // equipmentType entries (gaming set, focus, …) are picked explicitly via the
    // per-slot picker, not auto-resolved to a generic placeholder.
    if (item.equipmentType) return;
    const dbItem = findInventoryItem(itemDb, item.name, item.source);
    if (dbItem) out.push({ ...dbItem, qty: item.qty ?? 1 });
  });
  return out;
}

// equipmentType slots that need an explicit item pick, derived from the currently
// selected option of each choice block (or the whole block when it has no choices).
function collectEquipmentTypeSlots(eq, prefix, blocks, equipChoices) {
  const slots = [];
  const pushFrom = (node, keyBase) => {
    extractEquipItems(node).items
      .filter((entry) => entry.equipmentType)
      .forEach((entry, index) => slots.push({ slotKey: `${keyBase}__et${index}`, code: entry.name }));
  };
  if (blocks.length) {
    blocks.forEach((block) => {
      const selected = equipChoices[block.key];
      if (!selected) return;
      const option = block.options.find((opt) => opt.value === selected);
      if (option) pushFrom(option.node, `${block.key}_${selected}`);
    });
  } else {
    pushFrom(eq, prefix);
  }
  return slots;
}

// Add-list row: tap to expand the item reference (props + live rich text),
// pick a quantity, then Add. The quantity adder stops propagation so it never
// toggles the expand.
function AddItemRow({ item, onAdd }) {
  return (
    <ExpandableCard
      containerSx={{ borderBottom: 1, borderColor: 'divider' }}
      bodySx={{ px: 2, pt: 0.25, pb: 1.5 }}
      body={<ItemReferenceBody item={item} />}
      header={({ open, toggle }) => (
        <ListItemButton onClick={toggle} aria-expanded={open} sx={{ gap: 1, alignItems: 'flex-start' }}>
          <ItemNameIcon item={item} />
          <ListItemText primary={<Typography fontWeight={500} noWrap>{item.name}</Typography>} />
          <QuantityAdder onAdd={(qty) => onAdd(item, qty)} sx={{ alignSelf: 'center' }} />
        </ListItemButton>
      )}
    />
  );
}

// Current-inventory row: tap the name to expand the item reference; keep the
// quantity controls and full-row remove action on the right.
function CurrentInventoryRow({ item, index, dispatch }) {
  return (
    <ExpandableCard
      containerSx={{ borderBottom: 1, borderColor: 'divider' }}
      bodySx={{ px: 2, pt: 0.25, pb: 1.5 }}
      body={<ItemReferenceBody item={item} />}
      header={({ toggle }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75 }}>
          <Box onClick={toggle} sx={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ItemNameIcon item={item} />
            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem', minWidth: 0 }} noWrap>{item.name}</Typography>
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
            <Button size="small" onClick={() => dispatch({ type: 'inventory/qty', index, delta: -1 })}>-</Button>
            <Typography sx={{ width: 28, textAlign: 'center' }}>{item.qty ?? 1}</Typography>
            <Button size="small" onClick={() => dispatch({ type: 'inventory/qty', index, delta: 1 })}>+</Button>
            <Tooltip title="Remove row">
              <IconButton
                size="small"
                aria-label={`Remove ${item.name}`}
                onClick={() => dispatch({ type: 'inventory/remove', index })}
                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}
    />
  );
}

function StartingEquipmentBlock({ title, eq, prefix, character, items, dispatch }) {
  const blocks = collectChoiceBlocks(eq, prefix);
  const summary = flattenEquip(eq, []).slice(0, 8);
  const typeSlots = collectEquipmentTypeSlots(eq, prefix, blocks, character.equipChoices);
  if (!eq) return null;
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="h2" sx={{ mb: 1 }}>{title}</Typography>
      <Stack spacing={1}>
        {blocks.map((block) => (
          <Paper key={block.key} variant="outlined" sx={{ p: 1.25, bgcolor: 'background.default' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{block.label}</Typography>
            <Stack spacing={0.75}>
              {block.options.map((option) => {
                const selected = character.equipChoices[block.key] === option.value;
                return (
                  <Button
                    key={`${block.key}-${option.value}`}
                    size="small"
                    variant={selected ? 'contained' : 'outlined'}
                    sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                    onClick={() => {
                      dispatch({ type: 'equipment/select', key: block.key, value: option.value });
                      if (!selected) {
                        const extracted = extractEquipItems(option.node);
                        dispatch({
                          type: 'equipment/add-extracted',
                          currency: cpToCoins(extracted.cp),
                          items: resolveEquipmentItems(extracted, items),
                        });
                      }
                    }}
                  >
                    {option.value.toUpperCase()}) {option.label}
                  </Button>
                );
              })}
            </Stack>
          </Paper>
        ))}
        {typeSlots.map((slot) => {
          const candidates = equipmentTypeCandidates(slot.code, items);
          if (!candidates.length) return null;
          const selectedRef = character.equipChoices[slot.slotKey] || null;
          return (
            <Paper key={slot.slotKey} variant="outlined" sx={{ p: 1.25, bgcolor: 'background.default' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Choose {EQUIP_TYPE_LABELS[slot.code] || 'item'}
              </Typography>
              <Stack spacing={0.75}>
                {candidates.map((cand) => {
                  const ref = `${cand.name}|${cand.source}`;
                  const selected = selectedRef === ref;
                  return (
                    <Button
                      key={ref}
                      size="small"
                      variant={selected ? 'contained' : 'outlined'}
                      sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => dispatch({
                        type: 'equipment/select-type-item',
                        key: slot.slotKey,
                        item: { ...cand, qty: 1 },
                        prevRef: selectedRef,
                      })}
                    >
                      {cand.name}
                    </Button>
                  );
                })}
              </Stack>
            </Paper>
          );
        })}
        {!blocks.length ? summary.map((line, index) => <Chip key={`${line}-${index}`} label={line} sx={{ justifyContent: 'flex-start' }} />) : null}
      </Stack>
    </Paper>
  );
}

export default function EquipmentStep({ state, dispatch }) {
  const { character, search, inventoryFilter } = state;
  const [localQuery, setLocalQuery] = useState(search.inventory || '');
  useEffect(() => { setLocalQuery(search.inventory || ''); }, [search.inventory]);
  useEffect(() => {
    if (localQuery === search.inventory) return;
    const handle = setTimeout(() => dispatch({ type: 'search/set', scope: 'inventory', value: localQuery }), 200);
    return () => clearTimeout(handle);
  }, [localQuery]);
  const deferredQuery = useDeferredValue(localQuery);
  const query = deferredQuery.toLowerCase();

  const sortedItems = useMemo(() => {
    const groupOf = (item) => {
      const type = String(item.type || '').toLowerCase();
      if (type.includes('weapon') || ['m', 'r'].includes(type)) return 'weapon';
      if (type.includes('armor') || ['la', 'ma', 'ha', 's'].includes(type)) return 'armor';
      if (item.rarity && item.rarity !== 'none') return 'magic';
      return 'gear';
    };
    const filtered = state.data.items.filter((item) => {
      const matchesFilter = inventoryFilter === 'all' || groupOf(item) === inventoryFilter;
      const matchesQuery = !query || itemSearchText(item).includes(query);
      return matchesFilter && matchesQuery;
    });
    return filtered.sort((a, b) => {
      const aBase = !a.rarity || a.rarity === 'none' ? 0 : 1;
      const bBase = !b.rarity || b.rarity === 'none' ? 0 : 1;
      if (aBase !== bBase) return aBase - bBase;
      return a.name.localeCompare(b.name);
    });
  }, [state.data.items, inventoryFilter, query]);
  const visibleItems = useMemo(() => sortedItems.slice(0, ADD_LIST_CAP), [sortedItems]);
  const addItemWithQty = (item, qty) => dispatch({ type: 'inventory/add', item: { ...item, qty } });
  const totalWeight = totalCarriedWeight(character.inventory, character.currency);

  return (
    <Stack spacing={2}>
      <BuilderPanel id="panel-equip" title="Starting Equipment" icon={PackagePlus} note="Class/background packs add items and coins to inventory.">
        <Stack spacing={1.5}>
          <StartingEquipmentBlock title={character.className} eq={character.cls?.startingEquipment} prefix="cls" character={character} items={state.data.items} dispatch={dispatch} />
          <StartingEquipmentBlock title={character.backgroundName} eq={character.backgroundObj?.startingEquipment} prefix="bg" character={character} items={state.data.items} dispatch={dispatch} />
          {!character.cls?.startingEquipment && !character.backgroundObj?.startingEquipment ? (
            <Typography color="text.secondary">Select class and background to see starting equipment.</Typography>
          ) : null}
        </Stack>
      </BuilderPanel>

      <BuilderPanel id="panel-currency" title="Currency" icon={Coins}>
        <CurrencyRow
          currency={character.currency}
          onCoinChange={(coin, value) => dispatch({ type: 'currency/set', coin, value })}
          onCustomAmountChange={(id, value) => dispatch({ type: 'currency/custom-update', id, patch: { amount: value } })}
          onCustomMetaChange={(id, patch) => dispatch({ type: 'currency/custom-update', id, patch })}
          onCustomRemove={(id) => dispatch({ type: 'currency/custom-remove', id })}
          onCustomAdd={() => dispatch({ type: 'currency/custom-add' })}
          onReorder={(key, dir) => dispatch({ type: 'currency/reorder', key, dir })}
        />
      </BuilderPanel>

      <BuilderPanel id="panel-inventory" title="Inventory" icon={Backpack} note={`${formatWeight(totalWeight)} lb carried`}>
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            value={localQuery}
            placeholder="Search items"
            onChange={(event) => setLocalQuery(event.target.value)}
            slotProps={{ input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            } }}
          />
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {ITEM_FILTERS.map((filter) => (
              <Chip
                key={filter.key}
                label={filter.label}
                color={inventoryFilter === filter.key ? 'primary' : 'default'}
                onClick={() => dispatch({ type: 'inventory/filter', filter: filter.key })}
              />
            ))}
          </Stack>

          <Paper variant="outlined" sx={{ maxHeight: 430, overflow: 'auto' }}>
            <List dense disablePadding>
              {visibleItems.map((item) => (
                <AddItemRow key={`${item.name}-${item.source}`} item={item} onAdd={addItemWithQty} />
              ))}
            </List>
          </Paper>
          {sortedItems.length > visibleItems.length ? (
            <Typography variant="caption" color="text.secondary">
              {sortedItems.length - visibleItems.length} altri risultati. Affina ricerca.
            </Typography>
          ) : null}

          <Divider />
          <Typography variant="h2">Current Inventory</Typography>
          <Paper variant="outlined" sx={{ maxHeight: 430, overflow: 'auto' }}>
            <List dense disablePadding>
              {character.inventory.map((item, index) => (
                <CurrentInventoryRow key={`${item.name}-${index}`} item={item} index={index} dispatch={dispatch} />
              ))}
            </List>
          </Paper>
        </Stack>
      </BuilderPanel>
    </Stack>
  );
}
