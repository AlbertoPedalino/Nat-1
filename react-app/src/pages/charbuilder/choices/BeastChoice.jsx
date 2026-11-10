import { useMemo } from 'react';
import { Box, List, ListItemButton, ListItemText, Paper, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import SelectionSearch from './SelectionSearch.jsx';
import { useOptionSearch } from '../../../shared/content/searchText.js';
import { eligibleBeasts, beastRefValue, findBeast, parseBeastRef, wildShapeKnownFormsLimit } from '../../../shared/character/forms/beasts.js';
import { classLevel } from '../../../shared/character/progression/classLevel.js';
import { wildShapeCrCap } from '../../../shared/character/forms/wildShapeRules.js';
import { formatCr } from '../../../shared/bestiary/challengeRating.js';
import { asArray } from '../../../shared/lists.js';
import ChoiceFrame from './ChoiceFrame.jsx';
import { FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// Wild Shape known-forms picker. Mirrors the Replicate Magic Item flow: the
// player builds a personal list of beasts (filtered to the Wild Shape CR cap for
// their Druid level). Selections store stable `name|source` refs in choices, and
// the sheet resolves the active form from the same list.

function druidLevel(character) {
  return classLevel(character, 'Druid');
}

export default function BeastChoice({ spec, character, dispatch, beasts }) {
  const lv = druidLevel(character);
  const cap = wildShapeCrCap(character, lv);
  const options = useMemo(() => eligibleBeasts(beasts, lv, cap).map((beast) => ({
    value: beastRefValue(beast),
    beast,
  })), [beasts, lv, cap]);

  const selected = useMemo(() => {
    const raw = character?.choices?.[spec.key];
    return asArray(raw).filter(Boolean);
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

  // Capped at the known-forms limit.
  const toggle = (value) => dispatch({ type: 'choice/toggle-item', key: spec.key, value, max: limit, capped: true });

  return (
    <ChoiceFrame label={spec.label} count={selected.length} max={limit} countLabel={`${selected.length}/${limit} known`}>
      <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xs }}>
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
                  <ListItemButton selected={active} disabled={!active && atLimit} onClick={() => toggle(value)} sx={{ py: 0.75, px: 1, gap: 0.75 }}>
                    <ListItemText
                      primary={(
                        <Typography noWrap sx={{ color: 'text.primary', fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.regular }}>
                          {beast.name}
                        </Typography>
                      )}
                      secondary={`CR ${beast.cr} · ${beast.size} · AC ${beast.ac ?? '—'} · HP ${beast.hp.average} · ${beast.source}`}
                      slotProps={{ secondary: { noWrap: true, sx: { fontSize: FONT_SIZES.xxs } } }}
                    />
                    {active ? <Check size={ICON_SIZES.md} color="currentColor" /> : null}
                  </ListItemButton>
                </Box>
              );
            })}
          </List>
        ) : (
          <Box sx={{ px: 1, py: 0.75 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: FONT_SIZES.lg }}>
              {options.length ? 'No matches.' : (lv < 2 ? 'Reach Druid level 2 to learn beast forms.' : 'No beasts available.')}
            </Typography>
          </Box>
        )}
      </Paper>
    </ChoiceFrame>
  );
}
