import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Minus, Plus } from 'lucide-react';
import SearchField from '../../../shared/character/SearchField.jsx';
import { loadItems } from '../../charbuilder/logic/dataLoaders.js';
import { ItemNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';
import { ItemReferenceBody } from '../../../shared/character/ItemReference.jsx';
import {
  addCraftedItem,
  removeOneCrafted,
  craftedCount,
  craftedCountFor,
} from '../../../shared/character/craftedItems.js';
import { collectAllProficiencies } from '../logic/proficiency/index.js';
import { getMod, getFinal } from '../logic/calculations.js';
import { useSheetActions } from '../context/SheetActionsContext.jsx';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import {
  buildCreatedItemLookup,
  exactCreatedItemKey,
  prepareCreatedItemData,
  resolveCreatedItemValue,
} from '../../../shared/character/createdItemResolution.js';

// Generic interactive "create items from a list" panel. Driven entirely by the
// action's `detail` config so Replicate Magic Item, Tinker's Magic and Fast
// Crafting all reuse it:
//   { flag, tagLabel, items?, toolGroups?, itemLabel?, resolveItem?,
//     requireResolvedItem?,
//     max?, maxAbility?, minMax?, emptyHint? }
// - items: flat list of item names.
// - toolGroups: [{ tool, items }] filtered to the tools the character has.
// - itemLabel: optional display label for an item value.
// - resolveItem: optional (value, itemsDb) => concrete/derived item record.
// - requireResolvedItem: fail closed when the resolver cannot produce an item.
// - max: fixed cap, or maxAbility (e.g. 'int') for an ability-mod cap.

function resolveDetail(action, character, sheet) {
  const raw = action?.detail;
  if (typeof raw !== 'function') return raw || {};
  try {
    return raw({ action, character, sheet }) || {};
  } catch {
    return {};
  }
}

const stepBtnSx = (disabled) => ({
  width: 22,
  height: 22,
  border: 1,
  borderColor: 'divider',
  borderRadius: '3px',
  color: 'text.secondary',
  opacity: disabled ? 0.35 : 1,
  '&:hover': disabled ? {} : { borderColor: '#caa550', color: '#caa550' },
});

export default function CreatedItemsPanel({ action, character, sheet }) {
  const { onUpdateInventory } = useSheetActions();
  const profSets = useProficiencySets();
  const [itemsDb, setItemsDb] = useState([]);
  const detail = useMemo(() => resolveDetail(action, character, sheet), [action, character, sheet]);

  const flag = detail.flag;
  const tagLabel = detail.tagLabel || 'Created';
  const emptyHint = detail.emptyHint || 'Nothing available to create.';
  // Per-item active cap (e.g. Replicate Magic Item: one copy of each item).
  // Any non-positive / non-finite config means "no per-item limit".
  const maxPerItem = useMemo(() => {
    const n = Number(detail.maxPerItem);
    return Number.isFinite(n) && n > 0 ? n : Infinity;
  }, [detail.maxPerItem]);
  const searchable = !!detail.searchable;
  const requireResolvedItem = !!detail.requireResolvedItem;
  // Cap the list height (px) past which it scrolls instead of growing forever.
  // 0 / non-finite means "no cap" (grow to fit).
  const maxHeight = useMemo(() => {
    const n = Number(detail.maxHeight);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [detail.maxHeight]);
  const [query, setQuery] = useState('');
  const inv = sheet?.sheetInventory || [];

  // Resolve the cap: fixed number or an ability modifier (min `minMax`).
  const max = useMemo(() => {
    if (detail.maxAbility) {
      return Math.max(Number(detail.minMax || 1), getMod(getFinal(character, detail.maxAbility)));
    }
    return Math.max(0, Number(detail.max || 0));
  }, [detail.maxAbility, detail.minMax, detail.max, character]);

  // Resolve the craftable list: flat items, or tool-gated groups filtered to the
  // tools the character is proficient with.
  const items = useMemo(() => {
    if (Array.isArray(detail.items)) return detail.items;
    if (Array.isArray(detail.toolGroups)) {
      const sections = collectAllProficiencies(character, profSets) || [];
      const toolItems = (sections.find((s) => s.title === 'Tools')?.items) || [];
      const known = new Set(toolItems.map((t) => exactCreatedItemKey(t)));
      const out = [];
      detail.toolGroups.forEach((group) => {
        if (known.has(exactCreatedItemKey(group.tool))) (group.items || []).forEach((it) => out.push(it));
      });
      return [...new Set(out)];
    }
    return [];
  }, [detail.items, detail.toolGroups, character, profSets]);

  useEffect(() => {
    let alive = true;
    loadItems().then((db) => { if (alive) setItemsDb(db || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const { exactMap, looseMap } = useMemo(() => buildCreatedItemLookup(itemsDb), [itemsDb]);

  const resolveItem = useCallback((value) => resolveCreatedItemValue(value, {
    itemsDb,
    exactMap,
    looseMap,
    resolver: detail.resolveItem,
    requireResolvedItem,
  }), [detail.resolveItem, exactMap, itemsDb, looseMap, requireResolvedItem]);
  const itemLabel = useCallback((value) => {
    if (typeof detail.itemLabel === 'function') {
      try {
        const label = String(detail.itemLabel(value) || '').trim();
        if (label) return label;
      } catch {
        // Fall through to the resolved/raw item name.
      }
    }
    return resolveItem(value)?.name || String(value || '');
  }, [detail.itemLabel, resolveItem]);

  const total = craftedCount(inv, flag);
  const remaining = Math.max(0, max - total);

  const handleAdd = (value) => {
    if (remaining <= 0 || !onUpdateInventory) return;
    if (craftedCountFor(inv, flag, value) >= maxPerItem) return;
    const resolvedItem = resolveItem(value);
    if (requireResolvedItem && !resolvedItem) return;
    const label = itemLabel(value);
    const itemData = prepareCreatedItemData(resolvedItem, label);
    onUpdateInventory(addCraftedItem(inv, itemData, flag, value, max, action?.name));
  };

  const handleRemove = (value) => {
    if (!onUpdateInventory) return;
    if (craftedCountFor(inv, flag, value) <= 0) return;
    onUpdateInventory(removeOneCrafted(inv, flag, value));
  };

  const q = query.trim().toLowerCase();
  const visibleItems = useMemo(() => (
    searchable && q
      ? items.filter((value) => itemLabel(value).toLowerCase().includes(q))
      : items
  ), [itemLabel, items, searchable, q]);

  // "No more can be made" when every craftable is blocked — either the global
  // cap is full, or each item already sits at its per-item limit.
  const noneAddable = remaining <= 0
    || items.every((value) => (
      craftedCountFor(inv, flag, value) >= maxPerItem
      || (requireResolvedItem && !resolveItem(value))
    ));

  if (!items.length) {
    return (
      <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
        <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', fontStyle: 'italic' }}>
          {emptyHint}
        </Typography>
      </Box>
    );
  }

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.6 }}>
        <Typography sx={headerSx}>{tagLabel}</Typography>
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.62rem', fontWeight: 700, color: remaining > 0 ? '#edd48a' : '#de675f' }}>
          {total} / {max} active
        </Typography>
      </Box>

      {searchable ? (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search items…"
          iconSize={14}
          stopPropagation
          sx={{ mb: 0.6, '& .MuiInputBase-input': { fontSize: '0.78rem', py: '5px' } }}
        />
      ) : null}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          // Rows must not flex-shrink, else they collapse to thin lines when
          // their total height exceeds maxHeight — they should scroll instead.
          ...(maxHeight ? { maxHeight, overflowY: 'auto', pr: '4px', '& > *': { flexShrink: 0 } } : {}),
        }}
      >
        {visibleItems.length ? visibleItems.map((value) => {
          const label = itemLabel(value);
          const count = craftedCountFor(inv, flag, value);
          const dbItem = resolveItem(value);
          const unavailable = requireResolvedItem && !dbItem;
          const addDisabled = remaining <= 0 || count >= maxPerItem || unavailable;
          const removeDisabled = count <= 0;
          const stepper = (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
              <IconButton size="small" aria-label={`Remove ${label}`} disabled={removeDisabled} onClick={() => handleRemove(value)} sx={stepBtnSx(removeDisabled)}>
                <Minus size={13} />
              </IconButton>
              <Box sx={{ minWidth: 16, textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, fontSize: '0.78rem', color: '#edd48a' }}>{count}</Box>
              <IconButton size="small" aria-label={`Add ${label}`} disabled={addDisabled} onClick={() => handleAdd(value)} sx={stepBtnSx(addDisabled)}>
                <Plus size={13} />
              </IconButton>
            </Box>
          );
          const rowBorder = count > 0 ? 'rgba(202,165,80,0.4)' : 'divider';
          const rowBg = count > 0 ? 'rgba(202,165,80,0.06)' : 'rgba(35,32,26,1)';

          if (!dbItem) {
            return (
              <Box key={value} sx={{ display: 'flex', alignItems: 'center', gap: '7px', px: '8px', py: '5px', border: 1, borderColor: rowBorder, borderRadius: 1, bgcolor: rowBg }}>
                <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: 'text.primary' }}>{label}</Typography>
                {unavailable ? (
                  <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>Unavailable</Typography>
                ) : null}
                {stepper}
              </Box>
            );
          }

          return (
            <ExpandableCard
              key={value}
              containerSx={{ border: 1, borderColor: rowBorder, borderRadius: 1, bgcolor: rowBg, overflow: 'hidden' }}
              detailsSx={{ px: '10px', pt: '2px', pb: '8px', bgcolor: '#12100e', fontSize: '0.7rem', color: 'text.secondary' }}
              details={<ItemReferenceBody item={dbItem} />}
              summary={({ toggle }) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px', px: '8px', py: '5px' }}>
                  <Box onClick={toggle} sx={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <ItemNameIcon item={dbItem} />
                    <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: 'text.primary' }}>{label}</Typography>
                  </Box>
                  {stepper}
                </Box>
              )}
            />
          );
        }) : (
          <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', fontStyle: 'italic', py: 0.5 }}>
            No items match “{query.trim()}”.
          </Typography>
        )}
      </Box>

      {noneAddable ? (
        <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', fontStyle: 'italic', mt: 0.5 }}>
          {remaining <= 0
            ? 'Active limit reached. Remove one to make another.'
            : (requireResolvedItem && items.every((value) => !resolveItem(value))
              ? 'Item data unavailable. No item can be created.'
              : 'Each item already made or unavailable. Remove one to remake it.')}
        </Typography>
      ) : null}
    </Box>
  );
}

const panelSx = {
  mt: 0.8,
  p: 1,
  bgcolor: 'rgba(237,212,138,0.04)',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
};

const headerSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#edd48a',
};
