import { useMemo } from 'react';
import {
  Box,
  Chip,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import SelectionSearch, { useOptionSearch } from './SelectionSearch.jsx';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';
import { ItemReferenceBody } from '../../../shared/character/ItemReference.jsx';
import { ItemNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';
import {
  applyReplicateItemPlan,
  parseReplicateChoice,
  replicateBucketFromLabel,
  replicateBucketChoiceValue,
  replicateBucketItems,
  replicateItemChoiceValue,
} from '../../../shared/character/replicateMagicItem.js';

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
      containerSx={{ borderBottom: 1, borderColor: 'divider' }}
      detailsSx={itemDetailsSx}
      details={item ? <ItemReferenceBody item={item} /> : null}
      summary={({ open, toggle, disabled: expandDisabled }) => (
        <Stack direction="row" alignItems="stretch" sx={{ minWidth: 0 }}>
          <ListItemButton
            selected={active}
            disabled={selectionDisabled}
            onClick={onSelect}
            sx={{ flex: 1, minWidth: 0, gap: 0.75, py: 0.65, px: 1 }}
          >
            {item ? <ItemNameIcon item={item} /> : null}
            <ListItemText
              primary={(
                <Typography noWrap sx={{ color: 'text.primary', fontSize: '0.82rem', fontWeight: 500 }}>
                  {name}
                </Typography>
              )}
              secondary={source || null}
              secondaryTypographyProps={{ noWrap: true, sx: { fontSize: '0.58rem' } }}
            />
            {active ? <Check size={16} color="currentColor" /> : null}
          </ListItemButton>
          <IconButton
            size="small"
            disabled={expandDisabled}
            aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
            onClick={toggle}
            sx={{ borderRadius: 0, px: 1, color: 'text.secondary' }}
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </IconButton>
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
    <Stack spacing={0.6} sx={{ minWidth: 0 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem', fontWeight: 700 }}>
        {title}
      </Typography>
      {note ? (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.62rem', fontStyle: 'italic' }}>
          {note}
        </Typography>
      ) : null}
      {showSearch ? (
        <SelectionSearch value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      ) : null}
      <Paper variant="outlined" sx={{ maxHeight: 210, overflow: 'auto', bgcolor: 'background.default' }}>
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
            <Typography color="text.secondary" sx={{ fontSize: '0.78rem' }}>
              {options.length ? 'No matches.' : emptyText}
            </Typography>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

export default function ReplicateMagicItemChoice({ spec, character, dispatch, items }) {
  const pool = useMemo(() => spec.from || [], [spec.from]);
  const max = spec.count || 1;
  const selected = useMemo(() => {
    const raw = character?.choices?.[spec.key];
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return values.filter((value) => parseReplicateChoice(value));
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
    const matches = (items || []).filter((item) => lc(item?.name) === lc(name));
    if (!matches.length) return [{ value: name, name, source: '', item: null }];
    const seen = new Set();
    return matches.flatMap((item) => {
      const value = replicateItemChoiceValue(item);
      if (seen.has(value)) return [];
      seen.add(value);
      return [{ value, name: item.name, source: item.source, item }];
    });
  }), [specifics, items]);
  const specificNames = useMemo(() => new Set(specifics.map(lc)), [specifics]);

  const total = selected.length;
  const full = total >= max;
  const setPlans = (next) => dispatch({ type: 'choice/set', key: spec.key, value: next });

  const togglePlan = (name) => {
    if (selected.includes(name)) setPlans(selected.filter((v) => v !== name));
    else if (!full) setPlans([...selected, name]);
  };

  return (
    <Paper variant="outlined" sx={{ p: 1, minWidth: 0 }}>
      <Stack spacing={0.8} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.65} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'text.secondary',
              fontSize: '0.72rem',
              fontWeight: 800,
              lineHeight: 1.25,
            }}
          >
            {spec.label}
          </Typography>
          <Chip
            size="small"
            label={`${total}/${max}`}
            color={full ? 'primary' : 'default'}
            variant={full ? 'filled' : 'outlined'}
          />
        </Stack>

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
            .map((item) => ({
              value: replicateBucketChoiceValue(bucket, item),
              name: item.name,
              source: item.source,
              item: applyReplicateItemPlan(item, bucket),
            }));
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
      </Stack>
    </Paper>
  );
}
