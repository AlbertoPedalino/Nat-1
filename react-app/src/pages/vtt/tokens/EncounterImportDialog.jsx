import { useEffect, useMemo, useRef, useState } from 'react';
import { Cloud } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  Box,
  Button,
  CircularProgress,
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
import { CLOUD_STATES, listInstances, subscribeInstanceData } from '../../../shared/instances/instanceStore.js';
import { listToolInstances, pullInstance, refreshInstance } from '../../../shared/instances/instanceSync.js';
import { dedupeFightsByEncounter, isFightSuperseded, mergeLibrary } from '../../encounterbuilder/library/library.js';
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

// The encounters come from the GM's Encounter Builder saves, in this browser and
// in the cloud. The payload is always read from the local copy, which is what the
// builder writes and what the fights restore from; the cloud decides which saves
// are on offer and keeps those copies current:
// - a save only in the cloud is pulled down when it is picked, so the one
//   prepared on another machine imports here too;
// - a local copy linked to the cloud is fast-forwarded if the cloud moved on
//   and nothing here is unsynced;
// - a local-only save is read as it is.
// Offline, or with the cloud unreachable, the list is this browser's saves.
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
  const [listNotice, setListNotice] = useState('');
  // True until the cloud has answered: an empty list before then is not yet
  // "no saves", only "none in this browser".
  const [listing, setListing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchNotice, setFetchNotice] = useState('');
  // Each save is asked of the cloud once per opening of the dialog: switching
  // back to it, or the list refreshing under it, is not a reason to ask again.
  const fetchedRef = useRef(new Set());
  // Until the GM picks a save, the newest one is shown — including one the
  // cloud list brings in after this browser's own were already on screen.
  const pickedRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    fetchedRef.current = new Set();
    pickedRef.current = false;
    const apply = (rows) => {
      const list = [...rows].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setInstances(list);
      setInstanceId((current) => (
        pickedRef.current && list.some((entry) => entry.id === current) ? current : list[0]?.id || ''
      ));
    };
    // This browser's saves at once; the cloud's join them when it answers.
    apply(listInstances('encounters').map((entry) => ({
      ...entry, origin: 'local', hasLocal: true, cloudState: entry.cloud,
    })));
    setListNotice('');
    setListing(true);
    const unreachable = 'Could not reach the cloud: showing the saves in this browser.';
    listToolInstances('encounters')
      .then(({ rows, error }) => {
        if (cancelled) return;
        apply(rows);
        if (error) setListNotice(unreachable);
      })
      .catch(() => {
        if (!cancelled) setListNotice(unreachable);
      })
      .finally(() => { if (!cancelled) setListing(false); });
    return () => { cancelled = true; };
  }, [open]);

  const selectedInstance = instances.find((entry) => entry.id === instanceId) || null;
  const cloudOnly = Boolean(selectedInstance && !selectedInstance.hasLocal);
  const linked = Boolean(selectedInstance?.hasLocal && selectedInstance.cloudState === CLOUD_STATES.LINKED);

  useEffect(() => {
    setFetchNotice('');
    if (!open || !instanceId || (!cloudOnly && !linked)) return undefined;
    if (fetchedRef.current.has(instanceId)) return undefined;
    fetchedRef.current.add(instanceId);
    let cancelled = false;
    // Only a save with nothing here to show waits on the cloud; a linked copy is
    // shown as it is while it is brought up to date. Either way the new payload
    // reaches the reader below through the store's 'pulled' notice.
    if (cloudOnly) setFetching(true);
    const id = instanceId;
    const job = cloudOnly
      ? pullInstance('encounters', id).then(() => 'pulled')
      : refreshInstance('encounters', id);
    job
      .then((result) => {
        // Downloaded is local now, whether or not it is still the one on show.
        if (cloudOnly) {
          setInstances((list) => list.map((entry) => (entry.id === id
            ? { ...entry, hasLocal: true, cloudState: CLOUD_STATES.LINKED }
            : entry)));
        }
        if (!cancelled && result === 'conflict') {
          setFetchNotice('This save changed here and in the cloud. Open it in the Encounter Builder to choose; importing from the copy in this browser.');
        }
      })
      .catch(() => {
        // Let it be tried again the next time it is picked, even if the GM has
        // moved on to another save meanwhile.
        fetchedRef.current.delete(id);
        if (cancelled) return;
        setFetchNotice(cloudOnly
          ? 'Could not download this save from the cloud.'
          : 'Could not check the cloud for a newer copy; importing from this browser.');
      })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => {
      cancelled = true;
      setFetching(false);
    };
  }, [cloudOnly, instanceId, linked, open]);

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
  //
  // A fight launched before its card was last saved is left out: it holds the
  // creatures of the old version, and the card is launched again instead.
  const entries = useMemo(() => {
    const cardsById = new Map((library || []).map((enc) => [String(enc?.id), enc]));
    const current = dedupeFightsByEncounter(fights.filter((fight) => (
      fight.encounterId == null || !isFightSuperseded(cardsById.get(String(fight.encounterId)), fight)
    )));
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
          {listNotice ? <Typography sx={noticeSx}>{listNotice}</Typography> : null}
          {!instances.length && listing ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={16} />
              <Typography color="text.secondary" variant="body2">Loading your encounter saves…</Typography>
            </Stack>
          ) : null}
          {!instances.length && !listing ? (
            <Typography color="text.secondary" variant="body2">
              No Encounter Builder saves yet. Prepare one in the Encounter Builder, and sign in to
              see the ones made on another device.
            </Typography>
          ) : null}
          {instances.length ? (
            <>
              <TextField
                select
                size="small"
                label="Encounter builder"
                value={instanceId}
                onChange={(event) => {
                  pickedRef.current = true;
                  setInstanceId(event.target.value);
                }}
                helperText={fetching ? 'Downloading from the cloud…' : null}
              >
                {instances.map((instance) => (
                  <MenuItem key={instance.id} value={instance.id}>
                    <Box component="span" sx={instanceRowSx}>
                      <Box component="span" sx={instanceNameSx}>{instance.name || instance.id}</Box>
                      {instance.hasLocal ? null : (
                        <Box component="span" sx={cloudBadgeSx}>
                          <Cloud size={12} aria-hidden />
                          Cloud
                        </Box>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
              {fetchNotice ? <Typography sx={noticeSx}>{fetchNotice}</Typography> : null}

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
                  : fetching ? 'Waiting for the cloud copy…' : (entries.length
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
          ) : null}
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

const noticeSx = { color: 'warning.main', fontSize: '0.75rem', lineHeight: 1.4 };
const instanceRowSx = { display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' };
const instanceNameSx = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' };

// A save that is not in this browser yet: picking it downloads it.
const cloudBadgeSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.4,
  ml: 'auto',
  flexShrink: 0,
  px: 0.6,
  fontSize: '0.66rem',
  color: 'gmboard.vtt.gold',
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldBorder',
  borderRadius: 1,
};
