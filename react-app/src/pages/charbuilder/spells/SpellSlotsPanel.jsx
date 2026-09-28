import { Chip, Grid } from '@mui/material';
import { Wand2 } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { SPELL_LEVEL_LABELS } from '../constants.js';
import { getPrimaryClassLevel, getSpellSlots } from '../progression/calculations.js';

export default function SpellSlotsPanel({ character }) {
  const activeTab = character.activeClassTab || 0;
  const extraIndex = activeTab > 0 ? activeTab - 1 : null;
  const activeExtra = extraIndex != null ? character.extraClasses?.[extraIndex] : null;
  const isMulticlass = (character.extraClasses || []).length > 0;

  // Each class tab shows the slots that class would have on its own.
  const activeCharacter = activeExtra ? {
    ...character,
    className: activeExtra.name,
    classSource: activeExtra.source,
    classLevel: activeExtra.level || 1,
    level: activeExtra.level || 1,
    cls: activeExtra.cls,
    subclassShortName: activeExtra.subclassShortName || '',
    extraClasses: [],
  } : { ...character, classLevel: getPrimaryClassLevel(character), extraClasses: [] };

  const slotData = getSpellSlots(activeCharacter);
  const hasSlots = (slotData.slots || []).some((value) => value > 0) || slotData.pact;
  if (!hasSlots) return null;
  return (
    <BuilderPanel id="panel-slots" title={isMulticlass ? `Spell Slots — ${activeCharacter.className}` : 'Spell Slots'} icon={Wand2}>
      <Grid container spacing={1}>
        {SPELL_LEVEL_LABELS.slice(1).map((label, index) => (
          <Grid key={label} item xs={4} sm={3} md={2}>
            <Chip label={`${label}: ${slotData.slots[index] || '-'}`} variant="outlined" sx={{ width: '100%' }} />
          </Grid>
        ))}
      </Grid>
      {slotData.pact ? (
        <Chip sx={{ mt: 2 }} color="secondary" label={`Pact: ${slotData.pact.slots} slot(s), level ${slotData.pact.level}`} />
      ) : null}
    </BuilderPanel>
  );
}
