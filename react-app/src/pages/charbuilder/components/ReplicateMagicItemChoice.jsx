import { useMemo } from 'react';
import {
  Autocomplete,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Check } from 'lucide-react';
import {
  replicateBucketFromLabel,
  replicateBucketOptions,
  itemMatchesBucket,
} from '../../../shared/character/replicateMagicItem.js';

// Replicate Magic Item (EFA) plan picker. The plan pool mixes concrete named
// items ("Bag of Holding") with generic "buckets" (e.g. "Common magic item…").
// A bucket is not a real item — picking it must resolve to a concrete item
// matching the bucket's filter, which is what gets stored as the plan (so the
// character sheet card reads a real item, never a fictitious bucket entry).
// Concrete plans and bucket resolutions share one capped list (Plans Known),
// so total selected is enforced against `spec.count` here.

const lc = (value) => String(value || '').toLowerCase();

export default function ReplicateMagicItemChoice({ spec, character, dispatch, items }) {
  const pool = useMemo(() => spec.from || [], [spec.from]);
  const max = spec.count || 1;
  const selected = useMemo(() => {
    const raw = character?.choices?.[spec.key];
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
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

  const specificSet = useMemo(() => new Set(specifics.map(lc)), [specifics]);
  const itemByName = useMemo(() => {
    const m = new Map();
    (items || []).forEach((it) => { if (it?.name) m.set(lc(it.name), it); });
    return m;
  }, [items]);

  const total = selected.length;
  const full = total >= max;
  const setPlans = (next) => dispatch({ type: 'choice/set', key: spec.key, value: next });

  const toggleSpecific = (name) => {
    if (selected.includes(name)) setPlans(selected.filter((v) => v !== name));
    else if (!full) setPlans([...selected, name]);
  };
  const addBucketItem = (name) => {
    if (!name || full || selected.includes(name)) return;
    setPlans([...selected, name]);
  };
  const removeItem = (name) => setPlans(selected.filter((v) => v !== name));

  // Selected concrete picks that resolve to a given bucket (excludes named
  // specifics so e.g. Goggles of Night stays under its own row).
  const picksForBucket = (bucket) => selected.filter((v) => {
    if (specificSet.has(lc(v))) return false;
    return itemMatchesBucket(itemByName.get(lc(v)), bucket);
  });

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
          <Paper variant="outlined" sx={{ maxHeight: 210, overflow: 'auto', bgcolor: 'background.default' }}>
            <List dense disablePadding>
              {specifics.map((name) => {
                const active = selected.includes(name);
                return (
                  <ListItemButton
                    key={`${spec.key}-${name}`}
                    divider
                    selected={active}
                    disabled={!active && full}
                    onClick={() => toggleSpecific(name)}
                    sx={{
                      minWidth: 0,
                      py: 0.65,
                      px: 1,
                      '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                      '&.Mui-selected:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    <ListItemText
                      primary={(
                        <Typography
                          noWrap
                          sx={{ color: active ? 'inherit' : 'text.primary', fontSize: '0.82rem', fontWeight: active ? 800 : 500 }}
                        >
                          {name}
                        </Typography>
                      )}
                    />
                    {active ? <Check size={16} color="currentColor" /> : null}
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        ) : null}

        {buckets.map((bucket) => {
          const picks = picksForBucket(bucket);
          const options = replicateBucketOptions(items, bucket, new Set([
            ...specifics.map(lc),
            ...selected.map(lc),
          ]));
          return (
            <Stack key={`${spec.key}-bucket-${bucket.id}`} spacing={0.6} sx={{ minWidth: 0 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem', fontWeight: 700 }}>
                {bucket.label}
              </Typography>
              {picks.length ? (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {picks.map((p) => (
                    <Chip key={`${spec.key}-pick-${p}`} size="small" label={p} onDelete={() => removeItem(p)} color="primary" variant="outlined" />
                  ))}
                </Stack>
              ) : null}
              <Autocomplete
                size="small"
                options={options}
                value={null}
                blurOnSelect
                clearOnBlur
                disabled={full || !options.length}
                onChange={(_e, value) => { if (value) addBucketItem(value); }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={full ? 'Plans Known full' : (bucket.pickLabel || 'Pick a concrete item…')}
                    variant="outlined"
                  />
                )}
              />
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}
