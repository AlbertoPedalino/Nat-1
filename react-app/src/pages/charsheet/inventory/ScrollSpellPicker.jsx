import { useMemo, useState } from 'react';
import { Autocomplete, Stack, TextField } from '@mui/material';
import { loadSpells } from '../../../shared/content/catalogs/spellData.js';
import { scrollSpellStats, spellScrollLevel } from '../../../shared/character/inventory/spellScrolls.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { byName } from '../../../shared/lists.js';
import { cachedLoader } from '../../../shared/content/cachedLoader.js';
import { useLoaded } from '../../../shared/ui/useLoaded.js';
import { spellsForBooks } from '../../../shared/content/booksView.js';
import CardSection from '../../../shared/ui/CardSection.jsx';

// A catalog with files missing is not kept: the next scroll opened asks again
// for what failed.
const loadSpellCatalogCached = cachedLoader(loadSpells, { failed: (result) => result?.failedFiles?.length > 0 });
const loadSpellVersionsCached = async () => {
  const result = await loadSpellCatalogCached();
  return result?.spellVersions?.length ? result.spellVersions : (result?.spells || []);
};

// The spell written on a Spell Scroll: any spell of the scroll's level. Once
// picked it is cast from the Spells tab; the card keeps the scroll's own text.
// Its save DC and attack bonus are typed by hand (a scribed scroll's are its
// scribe's); left blank, a found scroll's fixed ones apply.
export default function ScrollSpellPicker({ item, character = null, onWrite }) {
  const level = spellScrollLevel(item);
  const spellsLoad = useLoaded(() => (level == null ? null : loadSpellVersionsCached()), [level]);
  // Spells of the character's books, each once.
  const spells = useMemo(() => (spellsLoad.status === 'error' ? [] : spellsForBooks(spellsLoad.data || [], character)), [spellsLoad.status, spellsLoad.data, character]);

  const options = useMemo(() => (spells || [])
    .filter((spell) => Number(spell.level ?? 0) === level)
    .map((spell) => ({ name: spell.name, source: spell.source || '' }))
    .sort(byName), [level, spells]);

  if (level == null) return null;
  const current = item.scrollSpell?.name ? item.scrollSpell : null;
  const fixed = scrollSpellStats(level);

  return (
    <CardSection title={level === 0 ? 'Cantrip' : `Level ${level} spell`} onClick={(event) => event.stopPropagation()}>
      <Autocomplete
        size="small"
        options={options}
        loading={spells == null}
        value={current}
        onChange={(_event, value) => onWrite({ scrollSpell: value ? { name: value.name, source: value.source } : null })}
        getOptionLabel={(option) => option?.name || ''}
        isOptionEqualToValue={(option, value) => option.name === value.name && option.source === value.source}
        renderInput={(params) => <TextField {...params} placeholder="Spell" />}
        sx={fieldSx}
      />
      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
        <StatField
          key={`dc-${item.scrollDc ?? ''}`}
          label="DC"
          value={item.scrollDc}
          placeholder={String(fixed.dc)}
          onCommit={(scrollDc) => onWrite({ scrollDc })}
        />
        <StatField
          key={`attack-${item.scrollAttack ?? ''}`}
          label="Attack"
          value={item.scrollAttack}
          placeholder={`+${fixed.attack}`}
          onCommit={(scrollAttack) => onWrite({ scrollAttack })}
        />
      </Stack>
    </CardSection>
  );
}

// A number written when the field is left; blank clears it.
function StatField({ label, value, placeholder, onCommit }) {
  const [text, setText] = useState(Number.isInteger(value) ? String(value) : '');
  const commit = () => {
    const parsed = parseInt(text, 10);
    const next = Number.isFinite(parsed) ? parsed : null;
    if (next !== (Number.isInteger(value) ? value : null)) onCommit(next);
  };
  return (
    <TextField
      size="small"
      label={label}
      value={text}
      placeholder={placeholder}
      onChange={(event) => {
        if (/^[+-]?\d*$/.test(event.target.value)) setText(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.querySelector('input')?.blur(); }}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric' } }}
      sx={statFieldSx}
    />
  );
}

const fieldSx = {
  maxWidth: 280,
  '& .MuiInputBase-root': { fontSize: FONT_SIZES.lg },
};
const statFieldSx = {
  width: 72,
  '& .MuiInputBase-root': { fontSize: FONT_SIZES.lg },
};
