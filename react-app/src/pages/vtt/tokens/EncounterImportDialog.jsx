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
import { readPersistedInstance } from '../../encounterbuilder/state/storage.js';
import { listInstances, subscribeInstanceData } from '../../../shared/instances/instanceStore.js';
import { dedupeFightsByEncounter, mergeLibrary } from '../../encounterbuilder/library/library.js';
import { buildCombat, restoreFight } from '../../encounterbuilder/combat/combat.js';
import { hydrateEncounterItems } from '../../encounterbuilder/bestiary/monsterUtils.js';
import { combatantToToken, importableCombatants } from '../../../shared/vtt/tokens/encounterImport.js';
import { useMonsterDb } from '../../encounterbuilder/bestiary/useMonsterDb.js';
import { fullscreenContainer } from '../map/fullscreenContainer.js';
import PiecePreview, { beginPiecePointerDrag } from './PiecePreview.jsx';
import {
  battleMapDialogActionsSx,
  battleMapDialogContentSx,
  battleMapDialogPaperSx,
  battleMapDialogPlacingPaperSx,
  battleMapDialogTitleSx,
  battleMapDropBackdropSx,
  battleMapDropDialogSx,
} from '../map/battleMapSurface.js';

// Encounters are local-first and scenes are cloud-only, so there is no query
// that joins them: the GM's own browser holds the encounter data, and the GM is
// the one importing. Reading localStorage here is the honest way round.
export default function EncounterImportDialog({
  open, onClose, onImport, busy, placing = false, onPlacementDragStart, onPlacementDragEnd,
}) {
  const monsterDb = useMonsterDb();
  const [instanceId, setInstanceId] = useState('');
  const [questKey, setQuestKey] = useState(ANY_QUEST);
  const [entryKey, setEntryKey] = useState('');
  const [hidden, setHidden] = useState(false);
  const [instances, setInstances] = useState([]);
  const [fights, setFights] = useState([]);
  const [library, setLibrary] = useState([]);

  useEffect(() => {
    if (!open) return;
    const list = listInstances('encounters');
    setInstances(list);
    setInstanceId((current) => (list.some((entry) => entry.id === current) ? current : list[0]?.id || ''));
  }, [open]);

  // Read every time the dialog is opened, and again whenever the builder writes.
  //
  // Read once and held was the bug: this tab and the builder are two tabs of one
  // browser, and a map left open since before tonight's prep offered whatever
  // the instance held when it was first opened — an encounter saved since was
  // simply not on the list. The instance store's feed covers the builder in
  // this tab, and `storage` covers it in any other.
  useEffect(() => {
    if (!open || !instanceId) {
      if (!instanceId) {
        setFights([]);
        setLibrary([]);
      }
      return undefined;
    }
    const read = () => {
      const persisted = readPersistedInstance(instanceId, []);
      setFights(persisted?.fightsData?.items || []);
      setLibrary(persisted?.library || []);
    };
    read();
    window.addEventListener('storage', read);
    const unsubscribe = subscribeInstanceData('encounters', instanceId, read);
    return () => {
      window.removeEventListener('storage', read);
      unsubscribe();
    };
  }, [instanceId, open]);

  // The filter belongs to the save being looked at, not to the dialog: keeping a
  // quest from the previous instance would hide everything in this one.
  useEffect(() => { setQuestKey(ANY_QUEST); }, [instanceId]);

  // What there is to import is the library, not the fights: an encounter that
  // was saved but never launched is still an encounter the GM wants on the
  // board, and it is launched on the way out. Each card carries at most one
  // fight — the newest, once the older ones of the same encounter are dropped —
  // and the quest is written on the card rather than on the fight.
  const entries = useMemo(() => {
    const current = dedupeFightsByEncounter(fights);
    const cards = mergeLibrary(library, current).map(({ enc, fight }) => ({
      key: `e:${enc.id}`,
      encounterId: enc.id,
      fight,
      name: enc.name || 'Encounter',
      quest: String(enc.quest || '').trim(),
      card: enc,
    }));
    // A fight whose card this device never got — a room sent over from the map,
    // and the library is still a blob one browser holds. It is offered under the
    // copy of the card the fight carries, or under its own name.
    const known = new Set((library || []).map((enc) => String(enc?.id)));
    const orphans = current
      .filter((fight) => fight.encounterId == null || !known.has(String(fight.encounterId)))
      .map((fight) => ({
        key: `f:${fight.id}`,
        encounterId: fight.encounterId ?? null,
        fight,
        name: fight.name || fight.encounter?.name || 'Fight',
        quest: String(fight.encounter?.quest || '').trim(),
        card: fight.encounter || null,
      }));
    return [...cards, ...orphans];
  }, [fights, library]);

  const quests = useMemo(
    () => [...new Set(entries.map((entry) => entry.quest).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [entries],
  );
  const unquested = entries.some((entry) => !entry.quest);
  const visible = useMemo(
    () => entries.filter((entry) => questKey === ANY_QUEST
      || (questKey === NO_QUEST ? !entry.quest : questKey === questValue(entry.quest))),
    [entries, questKey],
  );

  // The quest chosen decides what there is to pick from, so the encounter is
  // read off the list rather than held beside it: a choice the filter no longer
  // offers falls back to the first that it does, in the same render as the
  // filter itself.
  const currentKey = visible.some((entry) => entry.key === entryKey)
    ? entryKey
    : visible[0]?.key || '';
  const selected = useMemo(
    () => visible.find((entry) => entry.key === currentKey) || null,
    [currentKey, visible],
  );

  // Hydrated against the bestiary, not against an empty list. A snapshot stores
  // only a reference to each creature, so without the database `monsterData`
  // comes back null — which meant every imported piece fell back to the default
  // artwork and to a single square.
  //
  // An encounter with no fight is rolled up here only to be looked at: what
  // lands on the map comes from the launch itself, so reading down the list
  // writes nothing into the builder.
  const combatants = useMemo(() => {
    if (!selected) return [];
    if (selected.fight) return importableCombatants(restoreFight(selected.fight, monsterDb.monsters));
    const encounter = hydrateEncounterItems(selected.card?.encounter, monsterDb.monsters);
    return importableCombatants(buildCombat(encounter, [], selected.encounterId));
  }, [monsterDb.monsters, selected]);

  const layer = hidden ? 'gm' : 'tokens';
  const previewToken = useMemo(() => {
    if (!combatants.length) return null;
    const draft = combatantToToken(combatants[0], {
      layer,
      instanceId,
      fightId: selected?.fight?.id,
    });
    return { ...draft, imageUrl: draft.image_url || null };
  }, [combatants, instanceId, layer, selected]);

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

              {quests.length ? (
                <TextField
                  select
                  size="small"
                  label="Quest"
                  value={questKey}
                  onChange={(event) => setQuestKey(event.target.value)}
                >
                  <MenuItem value={ANY_QUEST}>All quests</MenuItem>
                  {quests.map((quest) => (
                    <MenuItem key={quest} value={questValue(quest)}>{quest}</MenuItem>
                  ))}
                  {unquested ? <MenuItem value={NO_QUEST}>No quest</MenuItem> : null}
                </TextField>
              ) : null}

              <TextField
                select
                size="small"
                label="Encounter"
                value={currentKey}
                onChange={(event) => setEntryKey(event.target.value)}
                disabled={!visible.length}
                helperText={visible.length
                  ? null
                  : (entries.length
                    ? 'No encounter in this quest.'
                    : 'This save has no encounter to import yet.')}
              >
                {visible.map((entry) => (
                  <MenuItem key={entry.key} value={entry.key}>{entry.name}</MenuItem>
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
                  fightId: selected?.fight?.id || null,
                  // An encounter with no fight is launched where it lands, so
                  // what travels is the encounter rather than a snapshot this
                  // dialog would have had to write in order to hand one over.
                  encounterId: selected?.encounterId ?? null,
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
                      ? (selected?.fight
                        ? 'Drag this group with mouse, touch or pen, or use Place them.'
                        : 'Never launched: placing it starts its fight in the Encounter Builder.')
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
            fightId: selected?.fight?.id || null,
            encounterId: selected?.encounterId ?? null,
          })}
        >
          Place them
        </Button>
      </DialogActions>
    </Dialog>
  );
}


// The two options that are not a quest. A quest of its own goes in prefixed,
// so one actually named "all" or "none" is still a quest and not the option
// above it.
const ANY_QUEST = 'all';
const NO_QUEST = 'none';
const questValue = (quest) => `q:${quest}`;

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
  WebkitTouchCallout: 'none',
  '&:hover': {
    borderColor: vttAlpha(VTT_COLORS.gold, 0.6),
    bgcolor: vttAlpha(VTT_COLORS.gold, 0.06),
  },
};
