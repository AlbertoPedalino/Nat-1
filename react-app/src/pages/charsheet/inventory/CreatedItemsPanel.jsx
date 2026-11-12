import { useCallback, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { ItemNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { ITEM_DETAILS_SX, ItemReferenceBody } from '../../../shared/character/inventory/ItemReference.jsx';
import { addCraftedItem, removeOneCrafted, craftedCount, craftedCountFor } from '../../../shared/character/inventory/craftedItemState.js';
import { collectAllProficiencies } from '../../../shared/character/proficiency/allProficiencies.js';
import { getMod, getFinal } from '../../../shared/character/sheet/sheetStats.js';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import {
  buildCreatedItemLookup,
  prepareCreatedItemData,
  resolveCreatedItemValue,
} from '../../../shared/character/inventory/createdItemResolution.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { matchesQuery } from '../../../shared/content/searchText.js';
import { useItemsDb } from './useItemsDb.js';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import { detailPanelSx, detailTitleSx } from '../layout/layout.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

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

export default function CreatedItemsPanel({ action, character, sheet }) {
  const { onUpdateInventory } = useSheetActions();
  const profSets = useProficiencySets();
  const itemsDb = useItemsDb();
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
      const known = new Set(toolItems.map((t) => matchKey(t)));
      const out = [];
      detail.toolGroups.forEach((group) => {
        if (known.has(matchKey(group.tool))) (group.items || []).forEach((it) => out.push(it));
      });
      return [...new Set(out)];
    }
    return [];
  }, [detail.items, detail.toolGroups, character, profSets]);

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

  const canAddItem = useCallback((value, resolvedItem = resolveItem(value)) => {
    if (typeof detail.canAddItem !== 'function') return true;
    try {
      return detail.canAddItem({
        value,
        resolvedItem,
        inventory: inv,
        flag,
        max,
      }) !== false;
    } catch {
      return false;
    }
  }, [detail.canAddItem, flag, inv, max, resolveItem]);

  const handleAdd = (value) => {
    if (remaining <= 0 || !onUpdateInventory) return;
    if (craftedCountFor(inv, flag, value) >= maxPerItem) return;
    const resolvedItem = resolveItem(value);
    if (requireResolvedItem && !resolvedItem) return;
    if (!canAddItem(value, resolvedItem)) return;
    const label = itemLabel(value);
    const itemData = prepareCreatedItemData(resolvedItem, label);
    onUpdateInventory(addCraftedItem(inv, itemData, flag, value, max, action?.name));
  };

  const handleRemove = (value) => {
    if (!onUpdateInventory) return;
    if (craftedCountFor(inv, flag, value) <= 0) return;
    onUpdateInventory(removeOneCrafted(inv, flag, value));
  };

  const visibleItems = useMemo(() => (
    searchable ? items.filter((value) => matchesQuery(query, itemLabel(value))) : items
  ), [itemLabel, items, searchable, query]);

  // "No more can be made" when every craftable is blocked — either the global
  // cap is full, or each item already sits at its per-item limit.
  const noneAddable = remaining <= 0
    || items.every((value) => (
      craftedCountFor(inv, flag, value) >= maxPerItem
      || (requireResolvedItem && !resolveItem(value))
      || !canAddItem(value)
    ));

  if (!items.length) {
    return (
      <Box onClick={(e) => e.stopPropagation()} sx={detailPanelSx}>
        <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.sm }}>
          {emptyHint}
        </Typography>
      </Box>
    );
  }

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={detailPanelSx}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={detailTitleSx}>{tagLabel}</Typography>
        <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xs, color: remaining > 0 ? UI_COLORS.accentText : UI_COLORS.danger }}>
          {total} / {max} active
        </Typography>
      </Box>

      {searchable ? (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search items…"
          density="compact"
          stopPropagation
          sx={{ mb: 0.5 }}
        />
      ) : null}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          // Rows must not flex-shrink, else they collapse to thin lines when
          // their total height exceeds maxHeight — they should scroll instead.
          ...(maxHeight ? { maxHeight, overflowY: 'auto', pr: 0.5, '& > *': { flexShrink: 0 } } : {}),
        }}
      >
        {visibleItems.length ? visibleItems.map((value) => {
          const label = itemLabel(value);
          const count = craftedCountFor(inv, flag, value);
          const dbItem = resolveItem(value);
          const unavailable = requireResolvedItem && !dbItem;
          const addDisabled = remaining <= 0 || count >= maxPerItem || unavailable || !canAddItem(value, dbItem);
          const removeDisabled = count <= 0;
          const stepper = (
            <CountStepper
              value={count}
              size={22}
              label={label}
              canDecrease={!removeDisabled}
              canIncrease={!addDisabled}
              onStep={(delta) => (delta < 0 ? handleRemove(value) : handleAdd(value))}
            />
          );
          const rowBorder = count > 0 ? uiAlpha(UI_COLORS.accent, OPACITY.edge) : UI_COLORS.edge;
          const rowBg = count > 0 ? uiAlpha(UI_COLORS.accent, OPACITY.wash) : UI_COLORS.surfaceHeader;

          if (!dbItem) {
            return (
              <Box key={value} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75, border: 2, borderColor: rowBorder, borderRadius: 1, bgcolor: rowBg }}>
                <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: FONT_SIZES.xl, color: 'text.primary' }}>{label}</Typography>
                {unavailable ? (
                  <Typography sx={{ fontSize: FONT_SIZES.xxs, color: 'text.secondary' }}>Unavailable</Typography>
                ) : null}
                {stepper}
              </Box>
            );
          }

          return (
            <ExpandableCard
              key={value}
              containerSx={{ border: 2, borderColor: rowBorder, borderRadius: 1, bgcolor: rowBg, overflow: 'hidden' }}
              detailsSx={ITEM_DETAILS_SX}
              details={<ItemReferenceBody item={dbItem} />}
              summary={({ toggle }) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75 }}>
                  <Box onClick={toggle} sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <ItemNameIcon item={dbItem} />
                    <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: FONT_SIZES.xl, color: 'text.primary' }}>{label}</Typography>
                  </Box>
                  {stepper}
                </Box>
              )}
            />
          );
        }) : (
          <EmptyLine inList>No items match “{query.trim()}”.</EmptyLine>
        )}
      </Box>

      {noneAddable ? (
        <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xxs, mt: 0.5 }}>
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

