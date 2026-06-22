import { useMemo } from 'react';
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Check } from 'lucide-react';
import SelectionSearch from './SelectionSearch.jsx';
import { useOptionSearch } from '../../../shared/character/searchText.js';
import {
  eligibleBeasts,
  beastRefValue,
  formatCr,
  wildShapeMaxCr,
  findBeast,
  parseBeastRef,
  wildShapeKnownFormsLimit,
} from '../../../shared/character/beasts.js';

// Wild Shape known-forms picker. Mirrors the Replicate Magic Item flow: the
// player builds a personal list of beasts (filtered to the Wild Shape CR cap for
// their Druid level). Selections store stable `name|source` refs in choices, and
// the sheet resolves the active form from the same list.

function druidLevel(character) {
  if (String(character?.className || '').toLowerCase() === 'druid') {
    return Number(character?.classLevel || character?.level || 1);
  }
  const extra = (character?.extraClasses || []).find((ec) => String(ec?.name || '').toLowerCase() === 'druid');
  return Number(extra?.level || 0);
}

export default function BeastChoice({ spec, character, dispatch, beasts }) {
  const lv = druidLevel(character);
  const cap = wildShapeMaxCr(lv);
  const options = useMemo(() => eligibleBeasts(beasts, lv).map((beast) => ({
    value: beastRefValue(beast),
    beast,
  })), [beasts, lv]);

  const selected = useMemo(() => {
    const raw = character?.choices?.[spec.key];
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
  }, [character?.choices, spec.key]);

  // Already-chosen forms that are no longer eligible (e.g. a Fly-Speed swarm
  // before level 8, or an over-CR pick) aren't in `options`, so they'd be
  // un-removable. Surface them as flagged rows so they can always be deselected.
  const orphanOptions = useMemo(() => {
    const eligibleValues = new Set(options.map((o) => o.value));
    return selected
      .filter((value) => !eligibleValues.has(value))
      .map((value) => {
        const parsed = parseBeastRef(value);
        const beast = findBeast(beasts, value)
          || { name: parsed?.name || value, cr: '—', size: '', ac: null, hp: { average: 0 }, source: parsed?.source || '' };
        return { value, beast, ineligible: true };
      });
  }, [selected, options, beasts]);

  const allOptions = useMemo(() => [...orphanOptions, ...options], [orphanOptions, options]);

  const { query, setQuery, showSearch, visibleOptions } = useOptionSearch(
    allOptions,
    { getText: (option) => `${option.beast.name} ${option.beast.cr} ${option.beast.size}` },
  );

  const limit = wildShapeKnownFormsLimit(lv);
  const atLimit = selected.length >= limit;

  const setForms = (next) => dispatch({ type: 'choice/set', key: spec.key, value: next });
  const toggle = (value) => {
    if (selected.includes(value)) setForms(selected.filter((v) => v !== value));
    else if (!atLimit) setForms([...selected, value]); // cap at the known-forms limit
  };

  return (
    <Paper variant="outlined" sx={{ p: 1, minWidth: 0 }}>
      <Stack spacing={0.8} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.65} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography sx={{ flex: 1, minWidth: 0, color: 'text.secondary', fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.25 }}>
            {spec.label}
          </Typography>
          <Chip size="small" label={`${selected.length}/${limit} known`} color={atLimit ? 'primary' : selected.length ? 'primary' : 'default'} variant={selected.length ? 'filled' : 'outlined'} />
        </Stack>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.62rem', fontStyle: 'italic' }}>
          {lv < 2
            ? 'Wild Shape unlocks at Druid level 2.'
            : `Know up to ${limit} forms · CR ≤ ${formatCr(cap)}${lv < 8 ? ' · no Fly Speed' : ''} (Druid level ${lv}). Swap one per Long Rest.`}
        </Typography>
        {showSearch ? <SelectionSearch value={query} onChange={setQuery} placeholder="Search beasts…" /> : null}
        <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto', bgcolor: 'background.default' }}>
          {visibleOptions.length ? (
            <List dense disablePadding>
              {visibleOptions.map(({ value, beast }) => {
                const active = selected.includes(value);
                return (
                  <Box key={value} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <ListItemButton selected={active} disabled={!active && atLimit} onClick={() => toggle(value)} sx={{ py: 0.65, px: 1, gap: 0.75 }}>
                      <ListItemText
                        primary={(
                          <Typography noWrap sx={{ color: 'text.primary', fontSize: '0.82rem', fontWeight: 500 }}>
                            {beast.name}
                          </Typography>
                        )}
                        secondary={`CR ${beast.cr} · ${beast.size} · AC ${beast.ac ?? '—'} · HP ${beast.hp.average} · ${beast.source}`}
                        secondaryTypographyProps={{ noWrap: true, sx: { fontSize: '0.58rem' } }}
                      />
                      {active ? <Check size={16} color="currentColor" /> : null}
                    </ListItemButton>
                  </Box>
                );
              })}
            </List>
          ) : (
            <Box sx={{ px: 1, py: 0.75 }}>
              <Typography color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                {options.length ? 'No matches.' : (lv < 2 ? 'Reach Druid level 2 to learn beast forms.' : 'No beasts available.')}
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Paper>
  );
}
