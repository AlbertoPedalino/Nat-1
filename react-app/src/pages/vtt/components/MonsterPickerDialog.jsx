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
import { monsterToToken } from '../../../shared/vtt/encounterImport.js';
import { fullscreenContainer } from '../logic/fullscreenContainer.js';
import { beginPieceDrag } from './PiecePreview.jsx';
import {
  battleMapDialogActionsSx,
  battleMapDialogContentSx,
  battleMapDialogPaperSx,
  battleMapDialogTitleSx,
  battleMapDropBackdropSx,
  battleMapDropDialogSx,
} from './battleMapSurface.js';

const EMPTY_FILTERS = { search: '', cr: '', type: '', sources: [] };

// The encounter builder's own bestiary panel, in a dialog. Same filters, same
// rows — it is the same component, wired to local state instead of that page's
// reducer, so the two never drift apart.
export default function MonsterPickerDialog({
  open, busy, onClose, onPlace, onPlacementDragStart, onPlacementDragEnd,
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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      container={fullscreenContainer}
      sx={battleMapDropDialogSx}
      slotProps={{
        paper: { sx: battleMapDialogPaperSx },
        backdrop: { sx: battleMapDropBackdropSx },
      }}
    >
      <DialogTitle sx={battleMapDialogTitleSx}>Place a creature</DialogTitle>
      <DialogContent dividers sx={battleMapDialogContentSx}>
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
            onDragStart={(event, monster) => {
              const layer = hidden ? 'gm' : 'tokens';
              const draft = monsterToToken(monster, { layer });
              beginPieceDrag(event);
              onPlacementDragStart?.({
                kind: 'monster',
                monster,
                count,
                layer,
                token: { ...draft, imageUrl: draft.image_url || null },
              });
            }}
            onDragEnd={onPlacementDragEnd}
            pickLabel="Place on the map"
            listSx={{ maxHeight: { xs: 300, md: 420 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={battleMapDialogActionsSx}>
        {/* The dialog stays open after a pick: placing a pack one creature at a
            time is the normal case, and reopening it each time is not. */}
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', pl: 1 }}>
          Drag a token onto the map, or use + to place it automatically.
        </Typography>
        <Button onClick={onClose} disabled={busy}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
