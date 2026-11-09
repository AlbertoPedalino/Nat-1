import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import MonsterBrowser from '../../../shared/bestiary/MonsterBrowser.jsx';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

export default function Reinforcements() {
  const { state, dispatch, monsterDb } = useEncounterBuilder();
  const [manual, setManual] = useState({ name: '', hpMax: 10, ac: 10, initMod: 0 });

  const addManual = () => {
    if (!manual.name.trim()) return;
    dispatch({ type: 'addManualCombatant', payload: manual });
    setManual({ name: '', hpMax: 10, ac: 10, initMod: 0 });
  };

  return (
    <Accordion disableGutters sx={{ ...SURFACES.panel, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ChevronDown size={ICON_SIZES.lg} />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Plus size={ICON_SIZES.md} />
          <Typography variant="h2">Reinforcements</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.2fr) minmax(260px,0.8fr)' }, gap: 2 }}>
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Search size={ICON_SIZES.md} />
              <Typography sx={{ fontWeight: FONT_WEIGHTS.bold }}>Search global database</Typography>
            </Stack>
            <MonsterBrowser
              monsterDb={monsterDb}
              filters={state.quickFilters}
              onFilterChange={(key, value) => dispatch({ type: 'setQuickFilter', key, value })}
              onSelect={(monster) => dispatch({ type: 'selectStatblock', payload: { monster } })}
              onPick={(monster) => dispatch({ type: 'addMonsterCombatant', monster })}
              pickLabel="Add to combat"
              listSx={{ maxHeight: 280 }}
            />
          </Stack>
          <Stack spacing={1.25}>
            <Typography sx={{ fontWeight: FONT_WEIGHTS.bold }}>Manual quick-add</Typography>
            <TextField size="small" label="Name" value={manual.name} onChange={(event) => setManual((prev) => ({ ...prev, name: event.target.value }))} />
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="HP Max" type="number" value={manual.hpMax} onChange={(event) => setManual((prev) => ({ ...prev, hpMax: event.target.value }))} />
              <TextField size="small" label="AC" type="number" value={manual.ac} onChange={(event) => setManual((prev) => ({ ...prev, ac: event.target.value }))} />
            </Stack>
            <TextField size="small" label="Init Mod" type="number" value={manual.initMod} onChange={(event) => setManual((prev) => ({ ...prev, initMod: event.target.value }))} />
            <Button variant="contained" startIcon={<Plus size={ICON_SIZES.md} />} onClick={addManual}>
              Add
            </Button>
          </Stack>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
