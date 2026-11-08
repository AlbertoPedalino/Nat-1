import { Chip, Grid } from '@mui/material';
import { Wand2 } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { SPELL_LEVEL_LABELS } from '../../../shared/character/spells/spellTables.js';
import { getSpellSlots } from '../../../shared/character/spells/spellcasting.js';
import { activeClassCharacter } from '../state/activeClass.js';

export default function SpellSlotsPanel({ character }) {
  const isMulticlass = (character.extraClasses || []).length > 0;
  // Each class tab shows the slots that class would have on its own.
  const activeCharacter = activeClassCharacter(character);
  const { regular: slots, pact } = getSpellSlots(activeCharacter);
  const hasSlots = slots.some((value) => value > 0) || pact;
  if (!hasSlots) return null;
  return (
    <BuilderPanel id="panel-slots" title={isMulticlass ? `Spell Slots — ${activeCharacter.className}` : 'Spell Slots'} icon={Wand2}>
      <Grid container spacing={1}>
        {SPELL_LEVEL_LABELS.slice(1).map((label, index) => (
          <Grid key={label} size={{ xs: 4, sm: 3, md: 2 }}>
            <Chip label={`${label}: ${slots[index] || '-'}`} variant="outlined" sx={{ width: '100%' }} />
          </Grid>
        ))}
      </Grid>
      {pact ? (
        <Chip sx={{ mt: 2 }} color="secondary" label={`Pact: ${pact.count} slot(s), level ${pact.level}`} />
      ) : null}
    </BuilderPanel>
  );
}
