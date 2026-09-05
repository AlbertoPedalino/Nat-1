import { useEffect, useMemo, useState } from 'react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { readRegistry, readPersistedInstance } from '../../../pages/encounterbuilder/logic/storage.js';
import { restoreFight } from '../../../pages/encounterbuilder/logic/combat.js';
import { combatantToToken, importableCombatants } from '../../../shared/vtt/encounterImport.js';
import { useMonsterDb } from '../../encounterbuilder/hooks/useMonsterDb.js';
import { fullscreenContainer } from '../logic/fullscreenContainer.js';
import PiecePreview, { beginPiecePointerDrag } from './PiecePreview.jsx';
import {
  battleMapDialogActionsSx,
  battleMapDialogContentSx,
  battleMapDialogPaperSx,
  battleMapDialogPlacingPaperSx,
  battleMapDialogTitleSx,
  battleMapDropBackdropSx,
  battleMapDropDialogSx,
} from './battleMapSurface.js';

// Encounters are local-first and scenes are cloud-only, so there is no query
// that joins them: the GM's own browser holds the encounter data, and the GM is
// the one importing. Reading localStorage here is the honest way round.
export default function EncounterImportDialog({
  open, onClose, onImport, busy, placing = false, onPlacementDragStart, onPlacementDragEnd,
}) {
  const monsterDb = useMonsterDb();
  const [instanceId, setInstanceId] = useState('');
  const [fightId, setFightId] = useState('');
  const [hidden, setHidden] = useState(false);
  const [instances, setInstances] = useState([]);
  const [fights, setFights] = useState([]);

  useEffect(() => {
    if (!open) return;
    const list = readRegistry();
    setInstances(list);
    setInstanceId((current) => current || list[0]?.id || '');
  }, [open]);

  useEffect(() => {
    if (!instanceId) {
      setFights([]);
      return;
    }
    const persisted = readPersistedInstance(instanceId, []);
    const items = persisted?.fightsData?.items || [];
    setFights(items);
    setFightId((current) => (items.some((fight) => fight.id === current) ? current : items[0]?.id || ''));
  }, [instanceId]);

  const selected = useMemo(() => fights.find((fight) => fight.id === fightId) || null, [fightId, fights]);

  // Hydrated against the bestiary, not against an empty list. A snapshot stores
  // only a reference to each creature, so without the database `monsterData`
  // comes back null — which meant every imported piece fell back to the default
  // artwork and to a single square.
  const combatants = useMemo(
    () => (selected ? importableCombatants(restoreFight(selected, monsterDb.monsters)) : []),
    [monsterDb.monsters, selected],
  );
  const layer = hidden ? 'gm' : 'tokens';
  const previewToken = useMemo(() => {
    if (!combatants.length) return null;
    const draft = combatantToToken(combatants[0], { layer, instanceId, fightId });
    return { ...draft, imageUrl: draft.image_url || null };
  }, [combatants, fightId, instanceId, layer]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      container={fullscreenContainer}
      sx={battleMapDropDialogSx}
      slotProps={{
        paper: { sx: [battleMapDialogPaperSx, placing && battleMapDialogPlacingPaperSx] },
        backdrop: { sx: battleMapDropBackdropSx },
      }}
    >
      <DialogTitle sx={battleMapDialogTitleSx}>Import from an encounter</DialogTitle>
      <DialogContent dividers sx={battleMapDialogContentSx}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {!instances.length ? (
            <Typography color="text.secondary" variant="body2">
              No encounter builder saves in this browser. Encounters live on the device that built
              them, so import from the machine you prepared on.
            </Typography>
          ) : (
            <>
              <TextField
                select
                size="small"
                label="Encounter builder"
                value={instanceId}
                onChange={(event) => setInstanceId(event.target.value)}
              >
                {instances.map((instance) => (
                  <MenuItem key={instance.id} value={instance.id}>{instance.name || instance.id}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Fight"
                value={fightId}
                onChange={(event) => setFightId(event.target.value)}
                disabled={!fights.length}
                helperText={fights.length ? null : 'This save has no fight to import yet.'}
              >
                {fights.map((fight) => (
                  <MenuItem key={fight.id} value={fight.id}>{fight.name || 'Fight'}</MenuItem>
                ))}
              </TextField>

              <FormControlLabel
                control={<Switch size="small" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />}
                label={<Typography variant="body2">Place on the GM layer</Typography>}
              />
              <Typography variant="caption" color="text.secondary">
                {hidden
                  ? 'The party will not receive these pieces until you move them to the token layer.'
                  : 'The party sees these pieces as soon as they land.'}
              </Typography>

              <Box
                onPointerDown={previewToken && !busy ? (event) => beginPiecePointerDrag(event, {
                  kind: 'encounter',
                  combatants,
                  layer,
                  instanceId,
                  fightId,
                  token: previewToken,
                  count: combatants.length,
                }, { onPlacementDragStart, onPlacementDragEnd }) : undefined}
                sx={{ ...placementCardSx, cursor: previewToken && !busy ? 'grab' : 'default' }}
              >
                {previewToken ? <PiecePreview token={previewToken} count={combatants.length} size={44} /> : null}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2">
                  {monsterDb.status === 'loading'
                    ? 'Loading the bestiary…'
                    : (combatants.length
                      ? `${combatants.length} creature${combatants.length === 1 ? '' : 's'} to place`
                      : 'Nothing to import from this fight.')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {combatants.length
                      ? 'Drag this group with mouse, touch or pen, or use Place them.'
                      : 'Player characters are skipped: they are already on the map.'}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={battleMapDialogActionsSx}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          disabled={busy || !combatants.length}
          onClick={() => onImport(combatants, {
            layer,
            instanceId,
            fightId,
          })}
        >
          Place them
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const placementCardSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  p: 1,
  borderRadius: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.25)}`,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.22),
  userSelect: 'none',
  touchAction: 'pan-y',
  '&:hover': {
    borderColor: vttAlpha(VTT_COLORS.gold, 0.6),
    bgcolor: vttAlpha(VTT_COLORS.gold, 0.06),
  },
};
