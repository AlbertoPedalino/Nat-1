import { useState } from 'react';
import {
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMonsterDb } from '../../../shared/bestiary/useMonsterDb.js';
import MonsterBrowser from '../../../shared/bestiary/MonsterBrowser.jsx';
import { monsterToToken } from '../../../shared/vtt/tokens/encounterImport.js';
import { beginPiecePointerDrag } from './PiecePreview.jsx';
import PlacementDialog from './PlacementDialog.jsx';
import { placementLayer, previewToken } from '../../../shared/vtt/tokens/placement.js';
import Caption from '../../../shared/ui/Caption.jsx';

const EMPTY_FILTERS = { search: '', cr: '', type: '', sources: [] };

// The encounter builder's own bestiary panel, in a dialog. Same filters, same
// rows — it is the same component, wired to local state instead of that page's
// reducer, so the two never drift apart.
export default function MonsterPickerDialog({
  open, busy, placing = false, onClose, onPlace, onPlacementDragStart, onPlacementDragEnd,
}) {
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
    <PlacementDialog
      open={open}
      onClose={onClose}
      placing={placing}
      maxWidth="md"
      title="Place a creature"
      actions={(
        <>
          {/* The dialog stays open after a pick: placing a pack one creature at a
              time is the normal case, and reopening it each time is not. */}
          <Caption sx={{ mr: 'auto', pl: 1 }}>
            Drag with mouse, touch or pen, or use + to place automatically.
          </Caption>
          <Button onClick={onClose} disabled={busy}>Done</Button>
        </>
      )}
    >
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
          <Caption>
            {hidden ? 'The party will not receive these pieces.' : 'The party sees them as soon as they land.'}
          </Caption>
        </Stack>

        <MonsterBrowser
          monsterDb={monsterDb}
          filters={filters}
          onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          onToggleSource={toggleSource}
          onPick={(monster) => onPlace(monster, count, { layer: placementLayer(hidden) })}
          onPointerDragStart={(event, monster) => {
            const layer = placementLayer(hidden);
            beginPiecePointerDrag(event, {
              kind: 'monster',
              monster,
              count,
              layer,
              token: previewToken(monsterToToken(monster, { layer })),
            }, { onPlacementDragStart, onPlacementDragEnd });
          }}
          pickLabel="Place on the map"
          listSx={{ maxHeight: { xs: 300, md: 420 } }}
        />
      </Stack>
    </PlacementDialog>
  );
}
