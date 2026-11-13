import { useMemo } from 'react';
import { Box, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { useOptionSearch } from '../../../shared/content/searchText.js';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { ItemReferenceBody } from '../../../shared/character/inventory/ItemReference.jsx';
import { ItemNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import {
  applyReplicateItemPlan,
  isReplicatePlanChoiceKey,
  parseReplicateChoice,
  replicateBucketFromLabel,
  replicateBucketChoiceValue,
  replicateBucketItems,
  replicateItemChoiceValue,
} from '../../../shared/character/inventory/replicateMagicItem.js';
import { asArray } from '../../../shared/lists.js';
import ChoiceFrame from './ChoiceFrame.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { BUILDER_TEXT } from '../layout/builderText.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';
import { scrollWellSx } from '../../../shared/ui/surfaces.js';
import RowExpandButton from '../../../shared/ui/RowExpandButton.jsx';
import SearchField from '../../../shared/ui/SearchField.jsx';

// Replicate Magic Item (EFA) plan picker. The plan pool mixes concrete named
// items ("Bag of Holding") with generic "buckets" (e.g. "Common magic item…").
// A bucket is not a real item — picking it must resolve to a concrete item
// matching the bucket's filter, which is what gets stored as the plan (so the
// character sheet card reads a real item, never a fictitious bucket entry).
// Concrete plans and bucket resolutions share one capped list (Plans Known),
// so total selected is enforced against `spec.count` here.

const lc = (value) => String(value || '').toLowerCase();

const itemDetailsSx = {
  px: 1,
  py: 0.75,
  bgcolor: 'background.paper',
  color: 'text.secondary',
};

function ItemPlanRow({ name, source, item, active, selectionDisabled, onSelect }) {
  return (
    <ExpandableCard
      disabled={!item}
      containerSx={{ ...LIST_ROW_RULE_SX }}
      detailsSx={itemDetailsSx}
      details={item ? <ItemReferenceBody item={item} /> : null}
      summary={({ open, toggle, disabled: expandDisabled }) => (
        <Stack direction="row" sx={{ alignItems: 'stretch', minWidth: 0 }}>
          <ListItemButton
            selected={active}
            disabled={selectionDisabled}
            onClick={onSelect}
            sx={{ flex: 1, minWidth: 0, gap: 0.75, py: 0.75, px: 1 }}
          >
            {item ? <ItemNameIcon item={item} /> : null}
            <ListItemText
              primary={(
                <Typography noWrap sx={BUILDER_TEXT.itemName}>
                  {name}
                </Typography>
              )}
              secondary={source || null}
              slotProps={{ secondary: { noWrap: true, sx: BUILDER_TEXT.itemMeta } }}
            />
            {active ? <Check size={ICON_SIZES.md} color="currentColor" /> : null}
          </ListItemButton>
          <RowExpandButton open={open} onToggle={toggle} label={name} disabled={expandDisabled} />
        </Stack>
      )}
    />
  );
}

function ItemPlanPanel({
  title,
  note,
  options,
  selected,
  full,
  onToggle,
  searchPlaceholder,
  emptyText = 'No items available.',
}) {
  const { query, setQuery, showSearch, visibleOptions } = useOptionSearch(
    options,
    { getText: (option) => `${option.name} ${option.source || ''}` },
  );
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Typography sx={BUILDER_TEXT.groupLabel}>
        {title}
      </Typography>
      {note ? (
        <Typography sx={BUILDER_TEXT.note}>
          {note}
        </Typography>
      ) : null}
      {showSearch ? (
        <SearchField density="compact" value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      ) : null}
      <Box sx={scrollWellSx(210)}>
        {visibleOptions.length ? (
          <List dense disablePadding>
            {visibleOptions.map(({ value, name, source, item }) => {
              const active = selected.includes(value);
              return (
                <ItemPlanRow
                  key={value}
                  name={name}
                  source={source}
                  item={item}
                  active={active}
                  selectionDisabled={!item || (!active && full)}
                  onSelect={() => onToggle(value)}
                />
              );
            })}
          </List>
        ) : (
          <Box sx={{ px: 1, py: 0.75 }}>
            <Typography sx={BUILDER_TEXT.hint}>
              {options.length ? 'No matches.' : emptyText}
            </Typography>
          </Box>
        )}
      </Box>
    </Stack>
  );
}

export default function ReplicateMagicItemChoice({ spec, character, dispatch, items }) {
  const pool = useMemo(() => spec.from || [], [spec.from]);
  const max = spec.count || 1;
  const itemAllowed = typeof spec.itemFilter === 'function' ? spec.itemFilter : () => true;
  const selected = useMemo(() => {
    const raw = character?.choices?.[spec.key];
    const values = asArray(raw).filter(Boolean);
    return values.filter((value) => parseReplicateChoice(value));
  }, [character?.choices, spec.key]);
  const selectedByOtherPlanSlots = useMemo(() => {
    const values = new Set();
    Object.entries(character?.choices || {}).forEach(([key, raw]) => {
      if (key === spec.key || !isReplicatePlanChoiceKey(key, character)) return;
      asArray(raw).filter(Boolean).forEach((value) => values.add(String(value)));
    });
    return values;
  }, [character?.choices, spec.key]);

  // Pool split: concrete named plans vs generic filter buckets (pool order).
  const { specifics, buckets } = useMemo(() => {
    const s = [];
    const b = [];
    pool.forEach((name) => {
      const bucket = replicateBucketFromLabel(name);
      if (bucket) b.push(bucket);
      else s.push(name);
    });
    return { specifics: s, buckets: b };
  }, [pool]);

  const specificOptions = useMemo(() => specifics.flatMap((name) => {
    const matches = (items || []).filter((item) => lc(item?.name) === lc(name) && itemAllowed(item));
    // A constrained picker (Armorer's bonus Armor plan) deliberately hides
    // named plans from other item categories instead of rendering them as
    // unresolved rows.
    if (!matches.length) return spec.itemFilter ? [] : [{ value: name, name, source: '', item: null }];
    const seen = new Set();
    return matches.flatMap((item) => {
      const value = replicateItemChoiceValue(item);
      if (seen.has(value)) return [];
      seen.add(value);
      return selectedByOtherPlanSlots.has(value) && !selected.includes(value)
        ? []
        : [{ value, name: item.name, source: item.source, item }];
    });
  }), [specifics, items, selected, selectedByOtherPlanSlots, spec.itemFilter]);
  const specificNames = useMemo(() => new Set(specifics.map(lc)), [specifics]);

  const total = selected.length;
  const full = total >= max;
  const togglePlan = (name) => dispatch({ type: 'choice/toggle-item', key: spec.key, value: name, max, capped: true });

  return (
    <ChoiceFrame label={spec.label} count={total} max={max}>
      {specifics.length ? (
        <ItemPlanPanel
          title="Named magic items"
          options={specificOptions}
          selected={selected}
          full={full}
          onToggle={togglePlan}
          searchPlaceholder="Search named plans…"
        />
      ) : null}

      {buckets.map((bucket) => {
        const options = replicateBucketItems(items, bucket, specificNames)
          .filter(itemAllowed)
          .map((item) => ({
            value: replicateBucketChoiceValue(bucket, item),
            name: item.name,
            source: item.source,
            item: applyReplicateItemPlan(item, bucket),
          }))
          .filter((option) => !selectedByOtherPlanSlots.has(option.value) || selected.includes(option.value));
        return (
          <ItemPlanPanel
            key={`${spec.key}-bucket-${bucket.id}`}
            title={bucket.label}
            note={bucket.requirementLabel}
            options={options}
            selected={selected}
            full={full}
            onToggle={togglePlan}
            searchPlaceholder={`Search ${bucket.label.toLowerCase()}…`}
            emptyText="No matching items available."
          />
        );
      })}
    </ChoiceFrame>
  );
}
