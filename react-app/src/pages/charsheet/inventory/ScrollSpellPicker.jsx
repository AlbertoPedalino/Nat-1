import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material';
import { loadSpells } from '../../charbuilder/data/dataLoaders.js';
import { scrollSpellStats, spellScrollLevel } from '../../../shared/character/inventory/spellScrolls.js';

let spellsPromise = null;
function loadSpellsCached() {
  if (!spellsPromise) {
    spellsPromise = loadSpells().then((result) => {
      // A catalog with files missing is not kept: the next scroll opened asks
      // again for what failed.
      if (result?.failedFiles?.length) spellsPromise = null;
      return result?.spells || [];
    }, (error) => {
      spellsPromise = null;
      throw error;
    });
  }
  return spellsPromise;
}

// The spell written on a Spell Scroll: any spell of the scroll's level. Once
// picked it is cast from the Spells tab; the card keeps the scroll's own text.
// Its save DC and attack bonus are typed by hand (a scribed scroll's are its
// scribe's); left blank, a found scroll's fixed ones apply.
export default function ScrollSpellPicker({ item, onWrite }) {
  const level = spellScrollLevel(item);
  const [spells, setSpells] = useState(null);

  useEffect(() => {
    if (level == null) return undefined;
    let alive = true;
    loadSpellsCached()
      .then((all) => { if (alive) setSpells(all || []); })
      .catch(() => { if (alive) setSpells([]); });
    return () => { alive = false; };
  }, [level]);

  const options = useMemo(() => (spells || [])
    .filter((spell) => Number(spell.level ?? 0) === level)
    .map((spell) => ({ name: spell.name, source: spell.source || '' }))
    .sort((a, b) => a.name.localeCompare(b.name)), [level, spells]);

  if (level == null) return null;
  const current = item.scrollSpell?.name ? item.scrollSpell : null;
  const fixed = scrollSpellStats(level);

  return (
    <Box sx={panelSx} onClick={(event) => event.stopPropagation()}>
      <Typography sx={titleSx}>{level === 0 ? 'Cantrip' : `Level ${level} spell`}</Typography>
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
    </Box>
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

const panelSx = { mt: '8px', pt: '8px', borderTop: '1px dashed', borderColor: 'divider' };
const titleSx = {
  fontSize: '0.6rem',
  color: '#edd48a',
  fontFamily: '"Cinzel", Georgia, serif',
  fontWeight: 700,
  letterSpacing: '0.08em',
  mb: 0.5,
};
const fieldSx = {
  maxWidth: 280,
  '& .MuiInputBase-root': { fontSize: '0.75rem' },
};
const statFieldSx = {
  width: 72,
  '& .MuiInputBase-root': { fontSize: '0.75rem' },
};
