import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMonsterDb } from '../../encounterbuilder/hooks/useMonsterDb.js';
import MonsterBrowser from '../../encounterbuilder/components/MonsterBrowser.jsx';
import { fullscreenContainer } from '../logic/fullscreenContainer.js';

const EMPTY_FILTERS = { search: '', cr: '', type: '', sources: [] };

// The encounter builder's own bestiary panel, in a dialog. Same filters, same
// rows — it is the same component, wired to local state instead of that page's
// reducer, so the two never drift apart.
export default function MonsterPickerDialog({ open, busy, onClose, onPlace }) {
  const monsterDb = useMonsterDb();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [count, setCount] = useState(1);
  const [hidden, setHidden] = useState(false);

  const toggleSource = (source) => setFilters((current) => ({
    ...current,
    sources: current.sources.includes(source)
      ? current.sources.filter((item) => item !== source)
      : [...current.sources, source],
  }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" container={fullscreenContainer}>
      <DialogTitle>Place a creature</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          {/* Placement options above the list: they apply to whichever creature
              you then pick, and hunting for them afterwards is worse. */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <TextField
              size="small"
              type="number"
              label="How many"
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              sx={{ width: 110 }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />}
              label={<Typography variant="body2">GM layer</Typography>}
            />
            <Typography variant="caption" color="text.secondary">
              {hidden ? 'The party will not receive these pieces.' : 'The party sees them as soon as they land.'}
            </Typography>
          </Stack>

          <MonsterBrowser
            monsterDb={monsterDb}
            filters={filters}
            onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
            onToggleSource={toggleSource}
            onPick={(monster) => onPlace(monster, count, { layer: hidden ? 'gm' : 'tokens' })}
            pickLabel="Place on the map"
            listSx={{ maxHeight: { xs: 300, md: 420 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        {/* The dialog stays open after a pick: placing a pack one creature at a
            time is the normal case, and reopening it each time is not. */}
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', pl: 1 }}>
          Place with the + button — you can pick several.
        </Typography>
        <Button onClick={onClose} disabled={busy}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
