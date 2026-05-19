import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { List as VList } from 'react-window';
import { Box, Button, Chip, Divider, Grid, InputAdornment, List, ListItem, ListItemButton, ListItemText, Paper, Stack, TextField, Typography } from '@mui/material';
import { Backpack, Coins, PackagePlus, Search } from 'lucide-react';
import BuilderPanel from '../components/BuilderPanel.jsx';
import { CURRENCY, ITEM_FILTERS } from '../constants.js';
import { ItemNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';
import { cleanText } from '../logic/text.js';

const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e'];

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
    item?.legacySource,
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
  const findDbItem = (name, source) => {
    const targetName = String(name || '').toLowerCase();
    const targetSource = String(source || '').toUpperCase();
    const exact = itemDb.find((item) => (
      item.name.toLowerCase() === targetName
      && (!targetSource || String(item.source || '').toUpperCase() === targetSource)
    ));
    if (exact) return exact;
    return itemDb.find((item) => (
      Array.isArray(item.group)
      && item.group.some((group) => String(group || '').toLowerCase() === targetName)
      && (!targetSource || String(item.source || '').toUpperCase() === targetSource)
    ));
  };
  const addResolved = (name, qty, source = '') => {
    const dbItem = findDbItem(name, source);
    if (dbItem?.packContents?.length && !['A', 'AF', 'AT'].includes(String(dbItem.type || '').split('|')[0])) {
      dbItem.packContents.forEach((entry) => {
        const ref = typeof entry === 'string' ? entry : entry.item || '';
        const parsed = parseItemRef(ref);
        const entryName = parsed.name;
        const entryQty = typeof entry === 'object' ? entry.quantity || 1 : 1;
        if (entryName) addResolved(entryName, entryQty * qty, parsed.source);
      });
      return;
    }
    if (dbItem) out.push({ ...dbItem, qty });
  };
  extracted.items.forEach((item) => addResolved(item.name || item, item.qty || 1, item.source));
  return out;
}

const ItemRow = memo(function ItemRow({ item, onAdd, style }) {
  return (
    <ListItemButton divider onClick={onAdd} sx={{ gap: 1 }} style={style}>
      <ItemNameIcon item={item} />
      <ListItemText
        primary={<Typography fontWeight={500} noWrap>{item.name}</Typography>}
        secondary={[item.source, item.rarity && item.rarity !== 'none' ? item.rarity : null, `${item.weight || 0} lb`].filter(Boolean).join(' - ')}
      />
      <Chip size="small" label={item.type} />
    </ListItemButton>
  );
});

const VirtualItemRow = ({ index, style, items, onAdd }) => {
  const item = items[index];
  if (!item) return null;
  return <ItemRow item={item} onAdd={() => onAdd(item)} style={style} />;
};

function StartingEquipmentBlock({ title, eq, prefix, character, items, dispatch }) {
  const blocks = collectChoiceBlocks(eq, prefix);
  const summary = flattenEquip(eq, []).slice(0, 8);
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
  const visibleItems = useMemo(() => sortedItems.slice(0, query ? 1500 : 800), [sortedItems, query]);
  const totalWeight = character.inventory.reduce((sum, item) => sum + (item.weight || 0) * (item.qty || 1), 0);

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
        <Grid container spacing={1.5}>
          {CURRENCY.map((coin) => (
            <Grid key={coin.key} item xs={6} sm={4} md={2.4}>
              <TextField
                fullWidth
                type="number"
                label={`${coin.label} (${coin.key.toUpperCase()})`}
                value={character.currency[coin.key]}
                inputProps={{ min: 0 }}
                sx={{ '& label': { color: coin.tone } }}
                onChange={(event) => dispatch({ type: 'currency/set', coin: coin.key, value: Number(event.target.value) || 0 })}
              />
            </Grid>
          ))}
        </Grid>
      </BuilderPanel>

      <BuilderPanel id="panel-inventory" title="Inventory" icon={Backpack} note={`${totalWeight.toFixed(1)} lb carried`}>
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

          <Paper variant="outlined" sx={{ height: 430, overflow: 'hidden' }}>
            <VList
              rowComponent={VirtualItemRow}
              rowCount={visibleItems.length}
              rowHeight={64}
              rowProps={{ items: visibleItems, onAdd: (item) => dispatch({ type: 'inventory/add', item }) }}
              defaultHeight={430}
              style={{ height: 430 }}
            />
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
              <ListItem key={`${item.name}-${index}`} divider secondaryAction={(
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Button size="small" onClick={() => dispatch({ type: 'inventory/qty', index, delta: -1 })}>
                    -
                  </Button>
                  <Typography sx={{ width: 28, textAlign: 'center' }}>{item.qty}</Typography>
                  <Button size="small" onClick={() => dispatch({ type: 'inventory/qty', index, delta: 1 })}>
                    +
                  </Button>
                </Stack>
              )}>
                <ListItemText
                  primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ItemNameIcon item={item} /><Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.name}</Typography></Box>}
                  secondary={[item.source, `${item.weight || 0} lb each`, item.type].filter(Boolean).join(' - ')}
                />
              </ListItem>
            ))}
            </List>
          </Paper>
        </Stack>
      </BuilderPanel>
    </Stack>
  );
}
